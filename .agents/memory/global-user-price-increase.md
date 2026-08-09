---
name: Global role price increases
description: Admin-wide percentage rules for independently adjusting User and Reseller prices.
---

The admin has separate percentage controls for User and Reseller prices. Each percentage applies only to its matching role, including imported catalog prices and manually configured fixed prices; entering 0 disables that role's increase.

**Why:** Admin needs to adjust complete role-specific catalogs without editing each product duration individually, while changing one role must not affect the other.

**How to apply:** Resolve the matching role's base price first, apply that role's percentage, round to two decimals, and preserve separate per-product DM/Only Contact and User/Reseller pricing behavior.