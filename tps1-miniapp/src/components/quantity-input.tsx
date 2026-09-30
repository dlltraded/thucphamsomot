import { Button } from "zmp-ui";
import { MinusIcon, PlusIcon } from "./vectors";
import { useEffect, useState } from "react";

export interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  minValue?: number;
  step?: number;
  allowZero?: boolean;
}

export default function QuantityInput(props: QuantityInputProps) {
  const step = props.step ?? 1;
  const [localValue, setLocalValue] = useState(String(props.value));

  useEffect(() => {
    setLocalValue(String(props.value));
  }, [props.value]);

  const handleStep = (delta: number) => {
    const next = Math.round((props.value + delta) * 1000) / 1000;
    const min = props.minValue ?? 0;
    if (delta < 0 && next < min) {
      if (props.allowZero) {
        props.onChange(0);
      } else {
        props.onChange(min);
      }
    } else {
      props.onChange(Math.max(props.allowZero ? 0 : min, next));
    }
  };

  return (
    <div className="w-full flex items-center">
      <Button
        size="small"
        variant="tertiary"
        className="min-w-0 aspect-square"
        onClick={() => handleStep(-step)}
      >
        <MinusIcon width={14} height={14} />
      </Button>
      <input
        style={{ width: `calc(${String(props.value).length}ch + 20px)` }}
        className="flex-1 text-center font-medium text-xs px-1 focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        type="number"
        step={step}
        inputMode="decimal"
        value={localValue}
        onChange={(e) => setLocalValue(e.currentTarget.value)}
        onBlur={() => {
          const parsed = parseFloat(localValue);
          const min = props.minValue ?? 0;
          if (isNaN(parsed) || parsed < min) {
            props.onChange(props.allowZero && parsed === 0 ? 0 : min);
          } else {
            props.onChange(Math.round(parsed * 1000) / 1000);
          }
        }}
      />
      <Button
        size="small"
        variant="tertiary"
        className="min-w-0 aspect-square"
        onClick={() => handleStep(step)}
      >
        <PlusIcon width={14} height={14} />
      </Button>
    </div>
  );
}
