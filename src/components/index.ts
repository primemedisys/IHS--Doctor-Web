/**
 * Shared component library barrel. These components are feature-agnostic and
 * must never import from `@/features/*`. Import a category (`@/components/cards`)
 * in hot paths to keep bundles lean; this root barrel is a convenience.
 */
export * from "./common";
export * from "./ui";
export * from "./forms";
export * from "./feedback";
export * from "./dialogs";
export * from "./cards";
export * from "./typography";
export * from "./navigation";
