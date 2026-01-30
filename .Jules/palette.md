## 2025-05-15 - [Standardized Button Loading Pattern]
**Learning:** In a design system with many forms, implementing a standardized `isLoading` prop in the core `Button` component ensures consistent accessibility (`aria-busy`), prevents double-submissions by default, and maintains a uniform visual language for asynchronous actions without repeating complex layout logic.
**Action:** Always prefer using the shared `Button` component with its `isLoading` prop over custom spinner implementations in forms to maintain consistency and accessibility standards.
