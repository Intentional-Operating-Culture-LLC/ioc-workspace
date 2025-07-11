import React from 'react';
import { cn } from "@ioc/shared/data-access";
export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'destructive';
}
export function Alert({ className, variant = 'default', ...props }: AlertProps) {
    const variants = {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
    };
    return (<div role="alert" className={cn('relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground', variants[variant], className)} {...props}/>);
}
export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
}
export function AlertTitle({ className, ...props }: AlertTitleProps) {
    return (<h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props}/>);
}
export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
}
export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
    return (<div className={cn('text-sm [&_p]:leading-relaxed', className)} {...props}/>);
}
