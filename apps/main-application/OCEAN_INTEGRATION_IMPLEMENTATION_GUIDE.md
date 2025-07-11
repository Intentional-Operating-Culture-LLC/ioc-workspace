# OCEAN Integration Implementation Guide

## Overview

This guide provides step-by-step instructions for integrating OCEAN (Big Five personality traits) mapping into the IOC prompt generation system. The integration adds three new metadata fields to all prompts:

- **OCEAN_Mapping**: Array of trait correlations
- **OCEAN_Primary**: Primary personality trait
- **OCEAN_Secondary**: Secondary personality trait (if applicable)

## Implementation Steps

### Step 1: Update Metadata Specification

Apply the changes from `OCEAN_metadata_specification_update.md` to the file:
`/home/darren/ioc-core/ioc-v3.1.1/10_prompt-library/10_10_Prompt_Metadata_Specification.md`

Add the three new fields to Section 2 (Required Fields) of the specification.

### Step 2: Install OCEAN Mapping Module

The OCEAN mapping utility has been created at:
`/home/darren/ioc-core/ioc-v3.1.1/10_prompt-library/prompt-tools/utilities/ocean_mapping.py`

This module provides:
- `calculate_ocean_mapping()`: Main function to calculate OCEAN correlations
- Archetype to OCEAN mapping based on the Integration Guide
- Keyword-based trait inference
- Scope-based defaults

### Step 3: Update Prompt Generation Scripts

#### For cluster_generation_standard.py:

1. Add the import at the top of the file:
```python
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'utilities'))
from ocean_mapping import calculate_ocean_mapping
```

2. Replace the `clean_llm_output_and_inject_metadata` function with the version in `cluster_generation_standard_ocean_update.py`

3. Update the LLM instruction in `get_llm_generated_prompt` to include OCEAN context

#### For cluster_generation_reverse.py:

Apply similar changes as above, ensuring reverse-coded prompts also get OCEAN mappings.

### Step 4: Validate Existing Prompts

Use the validation script to add OCEAN mappings to existing prompts:

```bash
cd /home/darren/ioc-core/ioc-v3.1.1/10_prompt-library/prompt-tools/utilities

# First, do a dry run to see the current state
python validate_ocean_mappings.py ../../generated-prompts --hierarchy ../../00_Core/00_Hierarchy/00_Hierarchy_v3.1.1_CURRENT.json --report-only

# Then update all prompts missing OCEAN mappings
python validate_ocean_mappings.py ../../generated-prompts --hierarchy ../../00_Core/00_Hierarchy/00_Hierarchy_v3.1.1_CURRENT.json --update
```

### Step 5: Test the Integration

1. Generate a new prompt to verify OCEAN fields are included:
```bash
cd /home/darren/ioc-core/ioc-v3.1.1/10_prompt-library/prompt-tools/active
python prompt_generator.py
# Select a node and generate with standard mode
```

2. Check the generated file has OCEAN fields in the YAML front matter

3. Verify the correlations make sense based on the node's concept

## OCEAN Mapping Logic

The system calculates OCEAN correlations based on:

1. **Archetype Tags (50% weight)**: Direct mapping from archetypes to OCEAN traits
   - Example: "Pioneer" → High Openness (+0.84), Moderate Extraversion (+0.73)

2. **Scope Defaults (30% weight)**: Base correlations for Individual/Executive/Organizational
   - Individual: Balanced across traits
   - Executive: Higher Conscientiousness and Extraversion
   - Organizational: Higher Conscientiousness and Agreeableness

3. **Keyword Analysis (20% weight)**: Concept keywords mapped to traits
   - "innovation" → High Openness (+0.90)
   - "discipline" → High Conscientiousness (+0.85)
   - "leadership" → High Extraversion (+0.75)

## Correlation Interpretation

- **Strong positive**: > +0.70 (trait strongly expressed)
- **Moderate positive**: +0.40 to +0.70 (trait moderately expressed)
- **Weak positive**: +0.10 to +0.40 (trait slightly expressed)
- **Neutral**: -0.10 to +0.10 (trait not particularly relevant)
- **Negative**: < -0.10 (opposite of trait expressed)

## Example Output

```yaml
OCEAN_Mapping:
  - trait: "Conscientiousness"
    correlation: 0.82
  - trait: "Openness"
    correlation: -0.31
OCEAN_Primary: "Conscientiousness"
OCEAN_Secondary: null
```

## Troubleshooting

1. **Missing OCEAN fields**: Run the validation script with `--update` flag
2. **Incorrect correlations**: Check archetype tags and keyword mappings in `ocean_mapping.py`
3. **Import errors**: Ensure the utilities folder is in the Python path

## Future Enhancements

1. Add OCEAN-based prompt variation (e.g., more creative prompts for high Openness nodes)
2. Create OCEAN profile reports for assessment participants
3. Use OCEAN mappings to recommend assessment paths
4. Integrate with the 360-review system for multi-rater OCEAN profiles

## Maintenance

- Regularly run the validation script to ensure all prompts have OCEAN mappings
- Update keyword mappings as new concepts are added to the hierarchy
- Review archetype correlations based on empirical data

---

*Implementation Date: January 10, 2025*
*Version: 1.0*