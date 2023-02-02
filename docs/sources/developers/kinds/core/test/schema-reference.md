---
keywords:
  - grafana
  - schema
title: Test kind
---
> Both documentation generation and kinds schemas are in active development and subject to change without prior notice.

## Test

#### Maturity: merged
#### Version: 0.0

A team is a named grouping of Grafana users to which access control rules may be assigned.

| Property        | Type              | Required | Description |
|-----------------|-------------------|----------|-------------|
| `anotherPerson` | [Person](#person) | **Yes**  |             |
| `field1`        | string            | **Yes**  |             |
| `person`        | [Person](#person) | **Yes**  |             |
| `type`          | string            | **Yes**  |             |

### Person

| Property  | Type               | Required | Description |
|-----------|--------------------|----------|-------------|
| `address` | [object](#address) | **Yes**  |             |
| `name`    | [object](#name)    | **Yes**  |             |

### Address

| Property | Type            | Required | Description |
|----------|-----------------|----------|-------------|
| `city`   | [object](#city) | **Yes**  |             |

### City

| Property | Type            | Required | Description |
|----------|-----------------|----------|-------------|
| `name`   | [object](#name) | **Yes**  |             |

### Name

| Property    | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `fullName`  | string | **Yes**  |             |
| `shortName` | string | **Yes**  |             |

### Name

| Property    | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `firstName` | string | **Yes**  |             |
| `lastName`  | string | **Yes**  |             |


