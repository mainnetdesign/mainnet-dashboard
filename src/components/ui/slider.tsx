import * as React from 'react';
import {
  Slider as AriaSlider,
  SliderFill,
  SliderThumb,
  SliderTrack,
} from 'react-aria-components';

import { cn } from '@/utils/cn';

export type SliderAccent = 'free' | 'pro' | 'max';

/** Matches AlignUI / shadcn Tooltip.Content styling — no Trigger wrapper on thumb. */
const DRAG_TOOLTIP_CLASS =
  'post-count-slider-drag-label pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-bg-strong-950 px-2.5 py-1 text-paragraph-sm font-medium text-text-white-0 tabular-nums shadow-tooltip';

function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

function accentFillClass(accent: SliderAccent): string {
  switch (accent) {
    case 'pro':
      return 'bg-feature-base';
    case 'max':
      return 'bg-warning-base';
    default:
      return 'bg-success-base';
  }
}

function startDragCursor(root: HTMLElement | null) {
  root?.setAttribute('data-dragging', '');
  document.body.style.cursor = 'grabbing';
}

function stopDragCursor(root: HTMLElement | null) {
  root?.removeAttribute('data-dragging');
  document.body.style.removeProperty('cursor');
}

function toValueArray(value: number | number[]): number[] {
  return Array.isArray(value) ? value : [value];
}

type SliderProps = {
  min?: number;
  max?: number;
  step?: number;
  accent?: SliderAccent;
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  formatTooltipValue?: (raw: number, thumbIndex: number) => React.ReactNode;
  thumbAriaLabels?: string[];
  disabled?: boolean;
  className?: string;
};

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      className,
      accent = 'free',
      min = 0,
      max = 100,
      step = 1,
      value,
      defaultValue,
      onValueChange,
      onValueCommit,
      formatTooltipValue,
      thumbAriaLabels,
      disabled,
    },
    forwardedRef,
  ) => {
    const rangeClass = accentFillClass(accent);
    const dotClass = accentFillClass(accent);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const draggingRef = React.useRef(false);
    const dragListenersRef = React.useRef<{
      onUp: () => void;
      onCancel: () => void;
    } | null>(null);
    const [dragValue, setDragValue] = React.useState<number[] | null>(null);

    const committedValues = value ?? defaultValue ?? [min];
    const displayValues = dragValue ?? committedValues;
    const thumbCount = Math.max(
      1,
      displayValues.length,
      committedValues.length,
      defaultValue?.length ?? 0,
    );
    const isRange = thumbCount > 1;

    const toAriaValue = React.useCallback(
      (values: number[]): number | number[] => {
        if (isRange) {
          return [values[0] ?? min, values[1] ?? values[0] ?? min];
        }
        return values[0] ?? min;
      },
      [isRange, min],
    );

    const ariaValue = toAriaValue(
      displayValues.length > 0 ? displayValues : committedValues,
    );

    React.useEffect(() => {
      if (!draggingRef.current) {
        setDragValue(null);
      }
    }, [value]);

    const detachWindowDragListeners = React.useCallback(() => {
      const listeners = dragListenersRef.current;
      if (!listeners) return;
      window.removeEventListener('pointerup', listeners.onUp);
      window.removeEventListener('pointercancel', listeners.onCancel);
      dragListenersRef.current = null;
    }, []);

    const finishDrag = React.useCallback(() => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      stopDragCursor(rootRef.current);
      detachWindowDragListeners();
    }, [detachWindowDragListeners]);

    React.useEffect(
      () => () => detachWindowDragListeners(),
      [detachWindowDragListeners],
    );

    const attachWindowDragListeners = React.useCallback(() => {
      detachWindowDragListeners();
      const onUp = () => finishDrag();
      const onCancel = () => finishDrag();
      dragListenersRef.current = { onUp, onCancel };
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    }, [detachWindowDragListeners, finishDrag]);

    const beginDrag = React.useCallback(() => {
      if (disabled || draggingRef.current) return;
      draggingRef.current = true;
      startDragCursor(rootRef.current);
      attachWindowDragListeners();
    }, [attachWindowDragListeners, disabled]);

    const handleChange = React.useCallback(
      (next: number | number[]) => {
        const arr = toValueArray(next);
        setDragValue(arr);
        onValueChange?.(arr);
      },
      [onValueChange],
    );

    const handleChangeEnd = React.useCallback(
      (next: number | number[]) => {
        finishDrag();
        setDragValue(null);
        onValueCommit?.(toValueArray(next));
      },
      [finishDrag, onValueCommit],
    );

    const tooltipLabel = React.useCallback(
      (thumbIndex: number) => {
        const raw = displayValues[thumbIndex] ?? displayValues[0] ?? min;
        if (formatTooltipValue) {
          return formatTooltipValue(raw, thumbIndex);
        }
        return String(raw);
      },
      [displayValues, formatTooltipValue, min],
    );

    return (
      <AriaSlider
        ref={mergeRefs(forwardedRef, rootRef)}
        className={cn(
          'post-count-slider-root relative w-full touch-none select-none pt-6',
          className,
        )}
        data-accent={accent}
        minValue={min}
        maxValue={max}
        step={step}
        value={ariaValue}
        defaultValue={
          defaultValue != null ? toAriaValue(defaultValue) : undefined
        }
        onChange={handleChange}
        onChangeEnd={handleChangeEnd}
        onPointerDown={() => beginDrag()}
        isDisabled={disabled}
        aria-labelledby="post-count-heading"
      >
        <SliderTrack className="relative flex h-5 w-full grow items-center">
          {({ state }) => (
            <>
              <div
                className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-bg-soft-200"
                aria-hidden
              >
                <SliderFill
                  className={cn('absolute h-full rounded-full', rangeClass)}
                />
              </div>
              {state.values.map((_, thumbIndex) => (
                <SliderThumb
                  key={thumbIndex}
                  index={thumbIndex}
                  aria-label={
                    thumbAriaLabels?.[thumbIndex] ??
                    `Slider thumb ${thumbIndex + 1}`
                  }
                  className={cn(
                    'post-count-slider-thumb block size-5 rounded-full bg-static-white shadow-[0_2px_8px_rgba(14,18,27,0.18)] ring-2 ring-static-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950 disabled:pointer-events-none disabled:opacity-50',
                  )}
                >
                  {({ isDragging }) => (
                    <>
                      {isDragging ? (
                        <span className={DRAG_TOOLTIP_CLASS} aria-hidden>
                          {tooltipLabel(thumbIndex)}
                        </span>
                      ) : null}
                      <span
                        className="pointer-events-none absolute inset-0 flex items-center justify-center"
                        aria-hidden
                      >
                        <span
                          className={cn('block size-2 rounded-full', dotClass)}
                        />
                      </span>
                    </>
                  )}
                </SliderThumb>
              ))}
            </>
          )}
        </SliderTrack>
      </AriaSlider>
    );
  },
);
Slider.displayName = 'Slider';

export { Slider };
