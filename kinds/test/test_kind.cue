package kind

name:        "Test"
maturity:    "merged"
description: "A team is a named grouping of Grafana users to which access control rules may be assigned."

lineage: seqs: [
	{
		schemas: [
			// v0.0
			{
				person:        #Person
				field1:        string
				anotherPerson: #Person
				type:          string

				#Person: {
					name: {
						firstName: string
						lastName:  string
					}
					address: {
						city: {
							name: {
								shortName: string
								fullName:  string
							}
						}
					}
				}

			},
		]
	},
]
