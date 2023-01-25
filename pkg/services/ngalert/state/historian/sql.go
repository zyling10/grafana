package historian

import (
	"context"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/ngalert/models"
	"github.com/grafana/grafana/pkg/services/ngalert/state"
	history_model "github.com/grafana/grafana/pkg/services/ngalert/state/historian/model"
	"github.com/grafana/grafana/pkg/services/ngalert/store"
	"github.com/grafana/grafana/pkg/services/sqlstore"
)

type historyRecord struct {
	UID        string    `xorm:"pk 'uid'"`
	RuleUID    string    `xorm:"rule_uid"`
	OrgID      int64     `xorm:"org_id"`
	State      string    `xorm:"state"`
	Reason     string    `xorm:"reason"`
	PrevState  string    `xorm:"prev_state"`
	PrevReason string    `xorm:"prev_reason"`
	At         time.Time `xorm:"at"`
	Labels     []label   `xorm:"-"`
}

type label struct {
	Name       string `xorm:"name"`
	Value      string `xorm:"value"`
	HistoryUID string `xorm:"history_uid"`
}

type SqlBackend struct {
	store *store.DBstore
	log   log.Logger
}

func NewSqlBackend(store *store.DBstore) *SqlBackend {
	return &SqlBackend{
		store: store,
		log:   log.New("ngalert.state.historian", "backend", "sql"),
	}
}

func (s *SqlBackend) RecordStatesAsync(ctx context.Context, rule history_model.RuleMeta, states []state.StateTransition) <-chan error {
	logger := s.log.FromContext(ctx)
	records, _ := s.buildRecords(rule, states, logger) // TODO
	errCh := make(chan error, 1)
	go func() {
		defer close(errCh)
		s.writeHistory(ctx, records) // TODO: should return error like the others.
	}()
	return errCh
}

func (s *SqlBackend) QueryStates(ctx context.Context, query models.HistoryQuery) (*data.Frame, error) {
	// TODO: There should be an app logic layer above this.
	// TODO: We should not allow querying of state history of rules that the user is not authorized to view.
	records := make([]historyRecord, 0)
	err := s.store.SQLStore.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		filter := ""
		_, err := sess.Table("alert_history").Where(filter).AllCols().Get(&records)
		return err
	})
	if err != nil {
		return nil, err
	}

	sort.Slice(records, func(i, j int) bool {
		return records[i].At.Before(records[j].At)
	})

	frame := data.NewFrame("states")

	return frame, nil
}

func (s *SqlBackend) buildRecords(rule history_model.RuleMeta, states []state.StateTransition, logger log.Logger) ([]historyRecord, error) {
	records := make([]historyRecord, 0, len(states))
	for _, state := range states {
		uid := uuid.New().String()
		filtered := removePrivateLabels(state.Labels)
		lbls := make([]label, 0, len(filtered))
		for n, v := range filtered {
			lbls = append(lbls, label{
				Name:       n,
				Value:      v,
				HistoryUID: uid,
			})
		}

		record := historyRecord{
			UID:        uid,
			RuleUID:    state.AlertRuleUID,
			OrgID:      state.OrgID,
			State:      string(models.InstanceStateType(state.State.State.String())),
			PrevState:  string(models.InstanceStateType(state.PreviousState.String())),
			Reason:     state.StateReason,
			PrevReason: state.PreviousStateReason,
			At:         state.LastEvaluationTime,
			Labels:     lbls,
		}
		records = append(records, record)
	}
	return records, nil
}

func (s *SqlBackend) writeHistory(ctx context.Context, records []historyRecord) {
	opts := sqlstore.NativeSettingsForDialect(s.store.SQLStore.GetDialect())

	err := s.store.SQLStore.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		_, err := sess.BulkInsert("alert_history", records, opts)
		return err
	})
	if err != nil {
		s.log.Error("Failed to persist state history entries", "error", err)
	}

	for _, r := range records {
		// We might be inserting a lot of objects, and they're all fairly low-priority.
		// Intentionally yield the connection between batches so we don't tie one connection down for too long.
		err = s.store.SQLStore.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
			_, err := sess.BulkInsert("alert_history_labels", r.Labels, opts)
			return err
		})
		if err != nil {
			s.log.Error("Failed to persist labels batch for state history entries", "error", err)
		}
	}
}
