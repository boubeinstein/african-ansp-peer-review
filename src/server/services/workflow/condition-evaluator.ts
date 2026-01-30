import type {
  Condition,
  ConditionGroup,
  TransitionConditions,
  EntityContext,
} from "@/types/workflow";

export class ConditionEvaluator {
  evaluate(
    conditions: TransitionConditions | null,
    context: EntityContext
  ): boolean {
    if (!conditions || !conditions.rules || conditions.rules.length === 0) {
      return true;
    }

    const logic = conditions.logic || "AND";
    const results = conditions.rules.map((rule) =>
      this.evaluateRule(rule, context)
    );

    return logic === "AND" ? results.every(Boolean) : results.some(Boolean);
  }

  private evaluateRule(
    rule: Condition | ConditionGroup,
    context: EntityContext
  ): boolean {
    if ("logic" in rule) {
      return this.evaluateGroup(rule, context);
    }
    return this.evaluateCondition(rule, context);
  }

  private evaluateGroup(
    group: ConditionGroup,
    context: EntityContext
  ): boolean {
    const results = group.conditions.map((c) => this.evaluateRule(c, context));
    return group.logic === "AND" ? results.every(Boolean) : results.some(Boolean);
  }

  private evaluateCondition(
    condition: Condition,
    context: EntityContext
  ): boolean {
    const value = this.getFieldValue(condition.field, context);

    switch (condition.operator) {
      case "eq":
        return value === condition.value;
      case "neq":
        return value !== condition.value;
      case "gt":
        return typeof value === "number" && value > (condition.value as number);
      case "gte":
        return typeof value === "number" && value >= (condition.value as number);
      case "lt":
        return typeof value === "number" && value < (condition.value as number);
      case "lte":
        return typeof value === "number" && value <= (condition.value as number);
      case "in":
        return Array.isArray(condition.value) && condition.value.includes(value);
      case "nin":
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case "exists":
        return condition.value ? value != null : value == null;
      case "regex":
        return (
          typeof value === "string" &&
          new RegExp(condition.value as string).test(value)
        );
      default:
        return false;
    }
  }

  private getFieldValue(field: string, context: EntityContext): unknown {
    const parts = field.split(".");
    let current: unknown = context;

    for (const part of parts) {
      if (current == null || typeof current !== "object") {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}

export const conditionEvaluator = new ConditionEvaluator();
