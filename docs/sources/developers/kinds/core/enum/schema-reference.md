---
keywords:
  - grafana
  - schema
title: Enum kind
---
> Both documentation generation and kinds schemas are in active development and subject to change without prior notice.

## Enum

#### Maturity: [merged](../../../maturity/#merged)
#### Version: 0.0

This is a schema written to test rendering docs for complex disjunctions.

| Property     | Type                              | Required | Description |
|--------------|-----------------------------------|----------|-------------|
| `somePanels` | Panel | GraphPanel | HeatmapPanel | No       |             |

### SomePanels

| Property     | Type                              | Required | Description                                                                                                        |
|--------------|-----------------------------------|----------|--------------------------------------------------------------------------------------------------------------------|
| `options`    | [object](#options)                | **Yes**  | *(Inherited from [Panel](#panel))*<br/>options is specified by the PanelOptions field in panel<br/>plugin schemas. |
| `type`       | string                            | **Yes**  | *(Inherited from [HeatmapPanel](#heatmappanel))*<br/>Possible values are: `heatmap`.                               |
| `datasource` | [object](#datasource)             | No       | *(Inherited from [Panel](#panel))*<br/>Description.                                                                |
| `id`         | uint32                            | No       | *(Inherited from [Panel](#panel))*                                                                                 |
| `legend`     | [object](#legend)                 | No       | *(Inherited from [GraphPanel](#graphpanel))*<br/>@deprecated this is part of deprecated graph panel                |
| `links`      | [DashboardLink](#dashboardlink)[] | No       | *(Inherited from [Panel](#panel))*<br/>Panel links                                                                 |
| `thresholds` |                                   | No       | *(Inherited from [Panel](#panel))*<br/>TODO docs - seems to be an old field from old dashboard alerts?             |
| `title`      | string                            | No       | *(Inherited from [Panel](#panel))*<br/>Panel title.                                                                |

### DashboardLink

FROM public/app/features/dashboard/state/DashboardModels.ts - ish

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `title`  | string | **Yes**  |             |
| `url`    | string | **Yes**  |             |

### GraphPanel

Support for legacy graph and heatmap panels.

| Property | Type              | Required | Description                                        |
|----------|-------------------|----------|----------------------------------------------------|
| `type`   | string            | **Yes**  | Possible values are: `graph`.                      |
| `legend` | [object](#legend) | No       | @deprecated this is part of deprecated graph panel |

### Legend

@deprecated this is part of deprecated graph panel

| Property   | Type    | Required | Description      |
|------------|---------|----------|------------------|
| `show`     | boolean | **Yes**  | Default: `true`. |
| `sortDesc` | boolean | No       |                  |
| `sort`     | string  | No       |                  |

### HeatmapPanel

| Property | Type   | Required | Description                     |
|----------|--------|----------|---------------------------------|
| `type`   | string | **Yes**  | Possible values are: `heatmap`. |

### Panel

Dashboard panels. Panels are canonically defined inline
because they share a version timeline with the dashboard
schema; they do not evolve independently.

| Property     | Type                              | Required | Description                                                                 |
|--------------|-----------------------------------|----------|-----------------------------------------------------------------------------|
| `options`    | [object](#options)                | **Yes**  | options is specified by the PanelOptions field in panel<br/>plugin schemas. |
| `type`       | string                            | **Yes**  | The panel plugin type id. May not be empty.<br/>Constraint: `length >=1`.   |
| `datasource` | [object](#datasource)             | No       | Description.                                                                |
| `id`         | uint32                            | No       |                                                                             |
| `links`      | [DashboardLink](#dashboardlink)[] | No       | Panel links                                                                 |
| `thresholds` |                                   | No       | TODO docs - seems to be an old field from old dashboard alerts?             |
| `title`      | string                            | No       | Panel title.                                                                |

### Datasource

Description.

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `type`   | string | No       |             |
| `uid`    | string | No       |             |

### Options

options is specified by the PanelOptions field in panel
plugin schemas.

| Property | Type | Required | Description |
|----------|------|----------|-------------|


