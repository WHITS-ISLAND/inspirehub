import { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useTagSuggestions } from "@/hooks/use-tag-suggestions";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagInput({ tags, onTagsChange }: TagInputProps) {
  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedQuery = useDebounce(tagInput, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const suggestions = useTagSuggestions(debouncedQuery);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as HTMLElement)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTag = (name: string) => {
    const tag = name.trim();
    if (tag && !tags.includes(tag)) {
      onTagsChange([...tags, tag]);
    }
    setTagInput("");
    setShowSuggestions(false);
  };

  const filteredSuggestions = suggestions.data?.suggestions.filter((s) => !tags.includes(s.name));

  return (
    <div>
      <div className="relative" ref={wrapperRef}>
        <div className="flex gap-1.5 items-center">
          <input
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (tagInput) setShowSuggestions(true);
            }}
            placeholder="タグ"
            className="h-7 w-28 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
          />
          <button
            type="button"
            onClick={() => addTag(tagInput)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Plus size={14} />
          </button>
        </div>
        {showSuggestions && filteredSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-background shadow-lg">
            {filteredSuggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addTag(s.name)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-secondary"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs"
            >
              {tag}
              <button type="button" onClick={() => onTagsChange(tags.filter((t) => t !== tag))}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
