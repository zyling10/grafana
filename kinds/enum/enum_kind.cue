package kind

import "strings"

name:        "Enum"
maturity:    "merged"
description: "This is a schema written to test rendering docs for complex disjunctions."

lineage: seqs: [
	{
		schemas: [
			// v0.0
			{
				panels?: [...(#Panel | #GraphPanel | #HeatmapPanel)]

				// Dashboard panels. Panels are canonically defined inline
				// because they share a version timeline with the dashboard
				// schema; they do not evolve independently.
				#Panel: {
					// The panel plugin type id. May not be empty.
					type: string & strings.MinRunes(1)
					id?:  uint32
					// Panel title.
					title?: string
					// Description.
					datasource?: {
						type?: string
						uid?:  string
					}
					// Panel links
					links?: [...#DashboardLink]
					// TODO docs - seems to be an old field from old dashboard alerts?
					thresholds?: [...]
					// options is specified by the PanelOptions field in panel
					// plugin schemas.
					options: {...}
				} @cuetsy(kind="interface") @grafana(TSVeneer="type")

				// FROM public/app/features/dashboard/state/DashboardModels.ts - ish
				#DashboardLink: {
					title: string
					url:   string
				} @cuetsy(kind="interface")

				// Support for legacy graph and heatmap panels.
				#GraphPanel: {
					type: "graph"
					// @deprecated this is part of deprecated graph panel
					legend?: {
						show:      bool | *true
						sort?:     string
						sortDesc?: bool
					}
					...
				} @cuetsy(kind="interface")

				#HeatmapPanel: {
					type: "heatmap"
					...
				} @cuetsy(kind="interface")
			},
		]
	},
]
