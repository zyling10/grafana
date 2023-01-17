package kind

name: "Test"
maturity: "merged"

lineage: seqs: [
	{
		schemas: [
			// v0.0
			{
				// Comments for a struct type
				structType: {
					field1: string
					field2: int64
				}
				arrayVal: [string]: [...int64]
				mapVal: [string]: [string]: string
				intVal: [string]: int64
				stringVal: [string]: string
			},
		]
	},
]
