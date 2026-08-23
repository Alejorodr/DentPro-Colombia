"use client";

import * as Icons from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { MARKETING_ICON_KEYS, type MarketingIconKey } from "@/lib/marketing/homepage-types";

type IconSelectProps =
  | {
      value: MarketingIconKey;
      onChange: (next: MarketingIconKey) => void;
      disabled?: boolean;
      allowEmpty?: false;
      emptyLabel?: string;
      className?: string;
    }
  | {
      value: MarketingIconKey | "";
      onChange: (next: MarketingIconKey | "") => void;
      disabled?: boolean;
      allowEmpty: true;
      emptyLabel?: string;
      className?: string;
    };

export function IconSelect(props: IconSelectProps) {
  const { value, disabled, emptyLabel = "Sin ícono", className } = props;
  const SelectedIcon = value
    ? (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[value]
    : undefined;

  const handleChange = (next: string) => {
    if (props.allowEmpty) {
      props.onChange(next as MarketingIconKey | "");
    } else {
      props.onChange(next as MarketingIconKey);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {SelectedIcon ? <SelectedIcon size={18} /> : null}
      <select
        // NOTE: `cn` here is a plain string-join (no tailwind-merge dedup), and Tailwind's
        // compiled stylesheet orders same-property utilities by scale value, not by source
        // order — so appending an override like "h-10" after a hardcoded "h-11" would NOT
        // reliably win the cascade. To keep overrides predictable, the default "h-11" (and
        // any other size/case utility) is only emitted when the caller doesn't supply its
        // own className; callers that override are responsible for their own full sizing.
        className={className ? cn("input flex-1 text-sm", className) : "input h-11 flex-1 text-sm"}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
      >
        {props.allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {MARKETING_ICON_KEYS.map((icon) => (
          <option key={icon} value={icon}>
            {icon}
          </option>
        ))}
      </select>
    </div>
  );
}
