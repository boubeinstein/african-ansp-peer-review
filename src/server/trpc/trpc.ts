import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";
import { UserRole } from "@prisma/client";

/**
 * Initialize tRPC with SuperJSON transformer for proper Date/Map/Set serialization
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof Error ? error.cause.message : null,
      },
    };
  },
});

/**
 * Create a router
 */
export const router = t.router;

/**
 * Create a caller factory for server-side calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * Middleware to log procedure calls (development only)
 */
const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === "development") {
    console.log(`[tRPC] ${type} ${path} - ${duration}ms`);
  }

  return result;
});

/**
 * Base public procedure - no authentication required
 */
export const publicProcedure = t.procedure.use(loggerMiddleware);

/**
 * Middleware to check if user is authenticated
 */
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure
  .use(loggerMiddleware)
  .use(isAuthed);

/**
 * Admin roles that have elevated access
 */
const ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROGRAMME_COORDINATOR",
];

/**
 * Middleware to check if user has admin role
 */
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  if (!ADMIN_ROLES.includes(ctx.session.user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this resource",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});

/**
 * Admin procedure - requires admin role
 */
export const adminProcedure = t.procedure.use(loggerMiddleware).use(isAdmin);

/**
 * Middleware to check for specific roles
 */
export const requireRole = (...roles: UserRole[]) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access this resource",
      });
    }

    if (!roles.includes(ctx.session.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This action requires one of the following roles: ${roles.join(", ")}`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
        user: ctx.session.user,
      },
    });
  });

/**
 * Create a procedure that requires specific roles
 */
export const roleProcedure = (...roles: UserRole[]) =>
  t.procedure.use(loggerMiddleware).use(requireRole(...roles));
