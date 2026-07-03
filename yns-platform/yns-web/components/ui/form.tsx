import * as React from 'react';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const Form = ({ children }: { children: React.ReactNode }) => <>{children}</>;

type FormFieldContextValue<TFieldValues extends FieldValues = FieldValues> = {
  name: FieldPath<TFieldValues>;
  fieldState: ReturnType<typeof useController>['fieldState'];
};

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

function FormField<TFieldValues extends FieldValues>({
  control,
  name,
  children,
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  children: (props: { field: any; fieldState: any }) => React.ReactNode;
}) {
  const controller = useController<TFieldValues>({ control, name });

  return (
    <FormFieldContext.Provider value={{ name, fieldState: controller.fieldState }}>
      <>{children({ field: controller.field, fieldState: controller.fieldState })}</>
    </FormFieldContext.Provider>
  );
}

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);

  return {
    id: itemContext.id,
    name: fieldContext.name,
    fieldState: fieldContext.fieldState,
  };
}

function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn('space-y-2', className)} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof Label>) {
  const { id } = useFormField();

  return <Label htmlFor={id} className={cn('text-sm font-bold text-slate-900', className)} {...props} />;
}

function FormControl({ children }: { children: React.ReactNode }) {
  const { id, fieldState } = useFormField();

  if (React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      id,
      'aria-invalid': !!fieldState.error,
      'aria-describedby': fieldState.error ? `${id}-error` : undefined,
    });
  }

  return <div className="space-y-1">{children}</div>;
}

function FormDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { id } = useFormField();

  return <p id={`${id}-description`} className={cn('text-xs leading-5 text-slate-500', className)} {...props} />;
}

function FormMessage({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { fieldState, id } = useFormField();
  const body = fieldState?.error?.message;

  return body ? (
    <p id={`${id}-error`} className={cn('text-sm font-semibold text-rose-600', className)} {...props}>
      {body}
    </p>
  ) : null;
}

export { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage };
