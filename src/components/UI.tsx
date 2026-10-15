import type { ReactNode, ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import s from "../App.module.css";
const base = import.meta.env.BASE_URL;
export function Brand({ reverse = false }: { reverse?: boolean }) {
  return (
    <span className={s.brand}>
      <img
        src={`${base}brand/${reverse ? "emblem-reverse" : "emblem"}.svg`}
        alt=""
      />
      <span>
        <strong>국립핑계관리청</strong>
        <small>NATIONAL EXCUSE OFFICE</small>
      </span>
    </span>
  );
}
export function Button({
  children,
  to,
  secondary = false,
  ...props
}: {
  children: ReactNode;
  to?: string;
  secondary?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const className = `${s.button} ${secondary ? s.secondary : ""}`;
  return to ? (
    <Link className={className} to={to}>
      {children}
    </Link>
  ) : (
    <button className={className} {...props}>
      {children}
    </button>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className={s.notice}>
      <ShieldCheck size={21} />
      <div>{children}</div>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className={s.pageHeading}>
      {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
      <h1 tabIndex={-1}>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p className={s.error} role="alert">
      {message}
    </p>
  ) : null;
}
export function DefinitionTable({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className={s.definitionTable}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className={s.emptyState}>
      <img src={`${base}brand/emblem.svg`} alt="" />
      <h2>{title}</h2>
      <p>{description}</p>
      <Button to="/services/defer">일상업무 유예 심사 신청</Button>
    </div>
  );
}
