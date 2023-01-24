package historian

import (
	"fmt"
	"os"
	"runtime/trace"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/grafana/grafana/pkg/components/simplejson"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/annotations"
	"github.com/grafana/grafana/pkg/services/ngalert/eval"
	"github.com/grafana/grafana/pkg/services/ngalert/models"
	ngmodels "github.com/grafana/grafana/pkg/services/ngalert/models"
	"github.com/grafana/grafana/pkg/services/ngalert/state"
)

func BenchmarkPointerRule(b *testing.B) {
	as := annotations.FakeAnnotationsRepo{}
	sut := NewAnnotationBackend(&as, nil, nil)
	logger := log.NewNopLogger()
	states := makeBenchStates()
	rule := makeBenchRule()
	rulePtr := &rule

	tfile, err := os.Create("rptr.out")
	if err != nil {
		panic(err)
	}
	defer tfile.Close()

	err = trace.Start(tfile)
	if err != nil {
		panic(err)
	}

	var items []annotations.Item
	for i := 0; i < b.N; i++ {
		// We only test from the buildAnnotations level.
		// buildAnnotations produces a separate object in memory in which all fields are copied out of its arguments.
		// Therefore, any logic after it (like recording of data) is not affected by whether the provided objects are pointers or not.
		items = sut.buildAnnotations(rulePtr, states, logger)
	}

	trace.Stop()

	b.StopTimer()

	_ = fmt.Sprintf("%v", len(items))
}

func BenchmarkCopyRule(b *testing.B) {
	as := annotations.FakeAnnotationsRepo{}
	sut := NewAnnotationBackend(&as, nil, nil)
	logger := log.NewNopLogger()
	states := makeBenchStates()
	rule := makeBenchRule()
	rulePtr := &rule

	tfile, err := os.Create("rcopy.out")
	if err != nil {
		panic(err)
	}
	defer tfile.Close()

	err = trace.Start(tfile)
	if err != nil {
		panic(err)
	}

	var items []annotations.Item
	for i := 0; i < b.N; i++ {
		items = sut.buildAnnotationsCopyRule(*rulePtr, states, logger)
	}

	trace.Stop()

	b.StopTimer()

	_ = fmt.Sprintf("%v", len(items))
}

func makeBenchRule() models.AlertRule {
	dashUID := "my-dash"
	panelID := int64(14)
	return models.AlertRule{
		ID:              5,
		OrgID:           1,
		Title:           "some rule",
		Condition:       "A",
		Data:            []models.AlertQuery{},
		Updated:         time.Now().UTC(),
		IntervalSeconds: 60,
		Version:         2,
		UID:             "abcd-efg",
		NamespaceUID:    "my-folder",
		DashboardUID:    &dashUID,
		PanelID:         &panelID,
		RuleGroup:       "my-group",
		RuleGroupIndex:  2,
		NoDataState:     models.NoData,
		ExecErrState:    models.ErrorErrState,
		For:             5 * time.Minute,
		Annotations: map[string]string{
			"text": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
			"url":  "https://grafana.com",
		},
		Labels: map[string]string{
			"alertname": "some rule",
			"a":         "b",
			"cluster":   "prod-eu-west-123",
			"namespace": "coolthings",
		},
	}
}

func makeBenchStates() []state.StateTransition {
	count := 100
	states := make([]state.StateTransition, 0, count)
	for i := 0; i < count; i++ {
		states = append(states, state.StateTransition{
			PreviousState: eval.Normal,
			State: &state.State{
				OrgID:        1,
				AlertRuleUID: "abcd-efg",
				CacheID:      "some-hash-123-123-123",
				State:        eval.Alerting,
				Error:        nil,
				Resolved:     false,
				Image:        nil,
				Annotations: map[string]string{
					"text": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
					"url":  "https://grafana.com",
				},
				Labels: map[string]string{
					"alertname": "some rule",
					"a":         "b",
					"cluster":   "prod-eu-west-123",
					"namespace": "coolthings",
				},
				Values: map[string]float64{
					"C": 123.0,
				},
				StartsAt: time.Now().UTC(),
				EndsAt:   time.Now().UTC(),
			},
		})
	}
	return states
}

// Below are alternate implementations of the preparation logic in `annotation.go`.

// buildAnnotationsCopy is exactly the same as buildAnnotations, but takes a copy of a rule instead of a pointer.
func (h *AnnotationBackend) buildAnnotationsCopyRule(rule ngmodels.AlertRule, states []state.StateTransition, logger log.Logger) []annotations.Item {
	items := make([]annotations.Item, 0, len(states))
	for _, state := range states {
		if !shouldRecord(state) {
			continue
		}
		logger.Debug("Alert state changed creating annotation", "newState", state.Formatted(), "oldState", state.PreviousFormatted())

		annotationText, annotationData := buildAnnotationTextAndDataCopyRule(rule, state.State)

		item := annotations.Item{
			AlertId:   rule.ID,
			OrgId:     state.OrgID,
			PrevState: state.PreviousFormatted(),
			NewState:  state.Formatted(),
			Text:      annotationText,
			Data:      annotationData,
			Epoch:     state.LastEvaluationTime.UnixNano() / int64(time.Millisecond),
		}

		items = append(items, item)
	}
	return items
}

// buildAnnotationTestAndDataCopyRule is exactly the same as buildAnnotationsTextAndData, but takes a copy of a rule instead of a pointer.
func buildAnnotationTextAndDataCopyRule(rule ngmodels.AlertRule, currentState *state.State) (string, *simplejson.Json) {
	jsonData := simplejson.New()
	var value string

	switch currentState.State {
	case eval.Error:
		if currentState.Error == nil {
			jsonData.Set("error", nil)
		} else {
			jsonData.Set("error", currentState.Error.Error())
		}
		value = "Error"
	case eval.NoData:
		jsonData.Set("noData", true)
		value = "No data"
	default:
		keys := make([]string, 0, len(currentState.Values))
		for k := range currentState.Values {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		var values []string
		for _, k := range keys {
			values = append(values, fmt.Sprintf("%s=%f", k, currentState.Values[k]))
		}
		jsonData.Set("values", simplejson.NewFromAny(currentState.Values))
		value = strings.Join(values, ", ")
	}

	labels := removePrivateLabels(currentState.Labels)
	return fmt.Sprintf("%s {%s} - %s", rule.Title, labels.String(), value), jsonData
}
