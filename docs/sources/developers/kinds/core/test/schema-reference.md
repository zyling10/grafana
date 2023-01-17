---
keywords:
  - grafana
  - schema
title: Test kind
---

# Test kind

### Maturity: merged
### Version: 0.0

| Property     | Type                                                         | Required | Description                |
|--------------|--------------------------------------------------------------|----------|----------------------------|
| `arrayVal`   | {"items":{"type":"integer","format":"int64"},"type":"array"} | **Yes**  |                            |
| `intVal`     | {"format":"int64","type":"integer"}                          | **Yes**  |                            |
| `mapVal`     | {"additionalProperties":{"type":"string"},"type":"object"}   | **Yes**  |                            |
| `stringVal`  | {"type":"string"}                                            | **Yes**  |                            |
| `structType` | [object](#structtype)                                        | **Yes**  | Comments for a struct type |

## structType

Comments for a struct type

| Property | Type    | Required | Description |
|----------|---------|----------|-------------|
| `field1` | string  | **Yes**  |             |
| `field2` | integer | **Yes**  |             |


