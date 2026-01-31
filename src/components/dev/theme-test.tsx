"use client";

/**
 * Theme Test Component - Development Only
 *
 * Use this component to visually verify all UI elements
 * work correctly in both light and dark modes.
 *
 * Usage: Import and render in a test page during development.
 * Remove or exclude from production builds.
 */

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Code } from "@/components/ui/code";

export function ThemeTest() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      {/* Theme Info & Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Dark Mode Test Suite
          </h1>
          <p className="text-muted-foreground">
            Current: <Code>{theme}</Code> | Resolved:{" "}
            <Code>{resolvedTheme}</Code>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("light")}
          >
            <Sun className="h-4 w-4 mr-1" />
            Light
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("dark")}
          >
            <Moon className="h-4 w-4 mr-1" />
            Dark
          </Button>
          <Button
            variant={theme === "system" ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme("system")}
          >
            <Monitor className="h-4 w-4 mr-1" />
            System
          </Button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>Text styles and colors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">
              Heading 1 (foreground)
            </h1>
            <h2 className="text-xl font-semibold text-foreground">
              Heading 2 (foreground)
            </h2>
            <p className="text-foreground">Regular paragraph text (foreground)</p>
            <p className="text-muted-foreground">
              Secondary/muted text (muted-foreground)
            </p>
            <a href="#" className="text-primary hover:underline">
              Link text (primary)
            </a>
            <p className="text-destructive">Error text (destructive)</p>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>All button variants</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Standard badge variants</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
          </CardContent>
        </Card>

        {/* Status Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Status Badges</CardTitle>
            <CardDescription>Severity and workflow states</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground w-16">Severity:</span>
              <StatusBadge variant="critical">Critical</StatusBadge>
              <StatusBadge variant="high">High</StatusBadge>
              <StatusBadge variant="medium">Medium</StatusBadge>
              <StatusBadge variant="low">Low</StatusBadge>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground w-16">Status:</span>
              <StatusBadge variant="success">Success</StatusBadge>
              <StatusBadge variant="warning">Warning</StatusBadge>
              <StatusBadge variant="error">Error</StatusBadge>
              <StatusBadge variant="info">Info</StatusBadge>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground w-16">Workflow:</span>
              <StatusBadge variant="draft">Draft</StatusBadge>
              <StatusBadge variant="pending">Pending</StatusBadge>
              <StatusBadge variant="active">Active</StatusBadge>
              <StatusBadge variant="completed">Completed</StatusBadge>
            </div>
          </CardContent>
        </Card>

        {/* Form Elements */}
        <Card>
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
            <CardDescription>Inputs, selects, and controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-input">Text Input</Label>
              <Input id="test-input" placeholder="Placeholder text" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-disabled">Disabled Input</Label>
              <Input id="test-disabled" disabled value="Disabled value" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-select">Select</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Option 1</SelectItem>
                  <SelectItem value="2">Option 2</SelectItem>
                  <SelectItem value="3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-textarea">Textarea</Label>
              <Textarea id="test-textarea" placeholder="Enter text..." />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="test-checkbox" />
                <Label htmlFor="test-checkbox">Checkbox</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="test-switch" />
                <Label htmlFor="test-switch">Switch</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backgrounds */}
        <Card>
          <CardHeader>
            <CardTitle>Background Colors</CardTitle>
            <CardDescription>Theme color tokens</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded bg-background border text-foreground">
              background
            </div>
            <div className="p-3 rounded bg-card border text-card-foreground">
              card
            </div>
            <div className="p-3 rounded bg-muted text-muted-foreground">
              muted
            </div>
            <div className="p-3 rounded bg-accent text-accent-foreground">
              accent
            </div>
            <div className="p-3 rounded bg-primary text-primary-foreground">
              primary
            </div>
            <div className="p-3 rounded bg-secondary text-secondary-foreground">
              secondary
            </div>
            <div className="p-3 rounded bg-destructive text-white">
              destructive
            </div>
            <div className="p-3 rounded bg-popover border text-popover-foreground">
              popover
            </div>
          </CardContent>
        </Card>

        {/* Loading States */}
        <Card>
          <CardHeader>
            <CardTitle>Loading States</CardTitle>
            <CardDescription>Skeletons and spinners</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        <Card>
          <CardHeader>
            <CardTitle>Empty State</CardTitle>
            <CardDescription>No content placeholder</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Info}
              title="No items found"
              description="Get started by creating your first item."
              action={<Button size="sm">Create Item</Button>}
            />
          </CardContent>
        </Card>

        {/* Alerts/Messages */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Alert Messages</CardTitle>
            <CardDescription>Status notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>Success message - Action completed successfully.</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Warning message - Please review before continuing.</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>Error message - Something went wrong.</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              <Info className="h-4 w-4" />
              <span>Info message - Here is some helpful information.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Code Display */}
      <Card>
        <CardHeader>
          <CardTitle>Code Display</CardTitle>
          <CardDescription>Inline and block code</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Review ID: <Code>REV-2026-001</Code> | Status:{" "}
            <Code>IN_PROGRESS</Code>
          </p>
          <Code block>
            {`// Example code block
const theme = useTheme();
console.log(theme.resolvedTheme);`}
          </Code>
        </CardContent>
      </Card>
    </div>
  );
}
