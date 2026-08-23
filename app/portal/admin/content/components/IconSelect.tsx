"use client";

import * as Icons from "@/components/ui/Icon";
import { MARKETING_ICON_KEYS, type MarketingIconKey } from "@/lib/marketing/homepage-types";

type IconSelectProps =
  | {
      value: MarketingIconKey;
      onChange: (next: MarketingIconKey) => void;
      disabled?: boolean;
      allowEmpty?: false;
      emptyLabel?: string;
    }
  | {
      value: MarketingIconKey | "";
      onChange: (next: MarketingIconKey | "") => void;
      disabled?: boolean;
      allowEmpty: true;
      emptyLabel?: string;
    };

export function IconSelect(props: IconSelectProps) {
  const { value, disabled, emptyLabel = "Sin ícono" } = props;
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
        className="input h-11 flex-1 text-sm"
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
