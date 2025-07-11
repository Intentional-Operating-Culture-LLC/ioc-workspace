# OCEAN Metadata Specification Update

Add the following fields to section 2 (Required Fields) of `10_10_Prompt_Metadata_Specification.md`:

## Additional Required Fields for OCEAN Integration

| Field                 | Type             | Description                                                                                             |
|-----------------------|------------------|---------------------------------------------------------------------------------------------------------|
| **OCEAN_Mapping** | `list[object]`   | Array of OCEAN trait correlations with strength values (e.g., `[{trait: "Openness", correlation: 0.76}]`) |
| **OCEAN_Primary** | `string`         | Primary OCEAN trait most strongly associated with this prompt (e.g., `Openness`, `Conscientiousness`) |
| **OCEAN_Secondary** | `string`         | Secondary OCEAN trait if applicable, otherwise `null`                                                   |

## Updated Example (add to section 6):

```yaml
# Version: 2025-06-20.1
# Date_Created: 2025-06-20
# Date_Updated: 2025-06-20
---
Full Key: 00.20.01.01.03.01.01.01.01
Full Key Code: 03_l1_systems-processes
Cluster: 03.01
Prompt Type: Likert
Scope: Organizational
Tier: Basic
Overlay Tags:
  - Systems
Archetype Tags:
  - Builder
Health Dimensions:
  - Structure
OCEAN_Mapping:
  - trait: "Conscientiousness"
    correlation: 0.82
  - trait: "Openness"
    correlation: -0.31
OCEAN_Primary: "Conscientiousness"
OCEAN_Secondary: null
Intentional Index: Yes
Prompt Template?: 'No'
Scored?: 'Yes'
Output Type: Auto
Capture Method: Standard
Ability Level:
  - Self-Directed
ReverseCoded: 'No'
AttentionCheck: 'Yes'
ValidationTrap: 'No'
Linked Report Node: 00.22.04.03
---
```