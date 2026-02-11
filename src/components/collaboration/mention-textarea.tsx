"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

export interface MentionUser {
  id: string;
  name: string;
  initials: string;
  role?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onKeyDown?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  teamMembers: MentionUser[];
  disabled?: boolean;
  className?: string;
  rows?: number;
  /** Current user id — excluded from mention dropdown */
  currentUserId?: string;
}

export function MentionTextarea({
  value,
  onChange,
  onSubmit,
  onKeyDown: onKeyDownProp,
  onBlur: onBlurProp,
  placeholder,
  teamMembers,
  disabled = false,
  currentUserId,
  className,
  rows = 3,
}: MentionTextareaProps) {
  const t = useTranslations("collaboration.mentions");
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build filtered list: @all + matching team members (exclude self)
  const filteredMembers = (() => {
    const query = mentionQuery.toLowerCase();
    const allOption: MentionUser = {
      id: "__all__",
      name: "all",
      initials: "ALL",
      role: t("everyone"),
    };

    const members = teamMembers
      .filter((m) => m.id !== currentUserId)
      .filter((m) => m.name.toLowerCase().includes(query));

    if ("all".includes(query)) {
      return [allOption, ...members];
    }
    return members;
  })();

  // Detect @ trigger while typing
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    onChange(newValue);

    // Look backwards from cursor for @ trigger
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex >= 0) {
      const charBefore =
        lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
      if (charBefore === " " || charBefore === "\n" || lastAtIndex === 0) {
        const queryAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        if (!queryAfterAt.includes(" ") && queryAfterAt.length <= 30) {
          setMentionQuery(queryAfterAt);
          setMentionStartPos(lastAtIndex);
          setShowDropdown(true);
          setSelectedIndex(0);
          return;
        }
      }
    }

    setShowDropdown(false);
    setMentionStartPos(null);
  };

  // Keyboard navigation in dropdown
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDownProp?.();

    if (showDropdown && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev + 1) % filteredMembers.length
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) =>
            (prev - 1 + filteredMembers.length) % filteredMembers.length
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMembers[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowDropdown(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Insert selected mention into text
  const insertMention = useCallback(
    (member: MentionUser) => {
      if (mentionStartPos === null) return;

      const textarea = textareaRef.current;
      if (!textarea) return;

      const before = value.slice(0, mentionStartPos);
      const afterCursor = value.slice(
        textarea.selectionStart || mentionStartPos
      );

      const mentionTag =
        member.id === "__all__"
          ? "@all"
          : `@[${member.name}](${member.id})`;

      const newValue = `${before}${mentionTag} ${afterCursor}`;
      onChange(newValue);

      setShowDropdown(false);
      setMentionStartPos(null);

      // Re-focus textarea with cursor after mention
      requestAnimationFrame(() => {
        const newCursorPos = before.length + mentionTag.length + 1;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      });
    },
    [value, mentionStartPos, onChange]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (!showDropdown || !dropdownRef.current) return;
    const selected = dropdownRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, showDropdown]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlurProp}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2",
          "text-sm ring-offset-background placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50 resize-y",
          className
        )}
      />

      {/* Mention hint */}
      <div className="mt-1 text-[10px] text-muted-foreground">
        {t("hint")}
      </div>

      {/* Mention dropdown */}
      {showDropdown && filteredMembers.length > 0 && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute bottom-full mb-1 left-0 z-50 w-72",
            "bg-popover text-popover-foreground rounded-md border shadow-lg",
            "max-h-48 overflow-y-auto"
          )}
        >
          <div className="p-1">
            {filteredMembers.map((member, index) => (
              <button
                key={member.id}
                type="button"
                data-index={index}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm",
                  "hover:bg-accent hover:text-accent-foreground",
                  "transition-colors cursor-pointer",
                  index === selectedIndex && "bg-accent text-accent-foreground"
                )}
                onMouseEnter={() => setSelectedIndex(index)}
                onMouseDown={(e) => {
                  // Prevent textarea blur before we insert
                  e.preventDefault();
                  insertMention(member);
                }}
              >
                {member.id === "__all__" ? (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-primary" />
                  </div>
                ) : (
                  <Avatar className="h-6 w-6 text-[10px]">
                    <AvatarFallback>{member.initials}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 text-left">
                  <div className="font-medium">
                    {member.id === "__all__"
                      ? `@all — ${t("everyone")}`
                      : member.name}
                  </div>
                  {member.role && member.id !== "__all__" && (
                    <div className="text-xs text-muted-foreground">
                      {member.role}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results message */}
      {showDropdown &&
        filteredMembers.length === 0 &&
        mentionQuery.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute bottom-full mb-1 left-0 z-50 w-72 bg-popover rounded-md border shadow-lg p-3 text-sm text-muted-foreground"
          >
            {t("noResults", { query: mentionQuery })}
          </div>
        )}
    </div>
  );
}
