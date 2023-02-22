package notifier

import (
	"bytes"
	"context"
	"crypto/md5"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
	"unicode"

	"github.com/grafana/alerting/receivers"
	models2 "github.com/prometheus/alertmanager/api/v2/models"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/prometheus/notifier"
	"github.com/prometheus/prometheus/pkg/labels"
	"gopkg.in/yaml.v3"

	"github.com/grafana/grafana/pkg/infra/log"
	apimodels "github.com/grafana/grafana/pkg/services/ngalert/api/tooling/definitions"
	"github.com/grafana/grafana/pkg/services/ngalert/models"
	ngmodels "github.com/grafana/grafana/pkg/services/ngalert/models"
	"github.com/grafana/grafana/pkg/setting"
)

type MimirGrafanaAlertmanager struct {
	client    *http.Client
	url       *url.URL
	orgID     int64
	logger    log.Logger
	decryptFn receivers.GetDecryptedValueFn
	store     AlertingStore
	settings  *setting.UnifiedAlertingSettings
}

func (m MimirGrafanaAlertmanager) PutAlerts(postableAlerts apimodels.PostableAlerts) error {
	data, err := json.Marshal(m.ConvertAlerts(postableAlerts))
	if err != nil {
		return err
	}
	m.logger.Info("Sending alerts", "data", data)
	return m.sendRequest("POST", "/alertmanager/api/v2/alerts", bytes.NewReader(data), true, func(response *http.Response) error {
		return nil
	})
}

func (m MimirGrafanaAlertmanager) StopAndWait() {
}

func (m MimirGrafanaAlertmanager) Ready() bool {
	return true
}

func (m MimirGrafanaAlertmanager) CleanupStore() {
}

func (m MimirGrafanaAlertmanager) SaveAndApplyDefaultConfig(ctx context.Context) error {
	cfg, err := Load([]byte(m.settings.DefaultConfiguration))
	if err != nil {
		return err
	}
	return m.SaveAndApplyConfig(ctx, cfg)
}

func (m MimirGrafanaAlertmanager) ApplyConfig(ctx context.Context, dbCfg *models.AlertConfiguration) error {
	var err error
	cfg, err := Load([]byte(dbCfg.AlertmanagerConfiguration))
	if err != nil {
		return fmt.Errorf("failed to parse Alertmanager config: %w", err)
	}
	if err := m.applyAndMarkConfig(ctx, dbCfg.ConfigurationHash, cfg); err != nil {
		return fmt.Errorf("unable to apply configuration: %w", err)
	}
	return nil
}

// applyAndMarkConfig applies a configuration and marks it as applied if no errors occur.
func (m *MimirGrafanaAlertmanager) applyAndMarkConfig(ctx context.Context, hash string, cfg *apimodels.PostableUserConfig) error {
	data, err := m.prepare(cfg)
	if err != nil {
		return err
	}

	err = m.applyConfig(data)
	if err != nil {
		return err
	}

	markConfigCmd := ngmodels.MarkConfigurationAsAppliedCmd{
		OrgID:             m.orgID,
		ConfigurationHash: hash,
	}
	return m.store.MarkConfigurationAsApplied(ctx, &markConfigCmd)
}

func (m MimirGrafanaAlertmanager) SaveAndApplyConfig(ctx context.Context, cfg *apimodels.PostableUserConfig) error {
	rawConfig, err := json.Marshal(&cfg)
	if err != nil {
		return fmt.Errorf("failed to serialize to the Alertmanager configuration: %w", err)
	}
	data, err := m.prepare(cfg)
	if err != nil {
		return err
	}

	cmd := &ngmodels.SaveAlertmanagerConfigurationCmd{
		AlertmanagerConfiguration: string(rawConfig),
		ConfigurationVersion:      fmt.Sprintf("v%d", ngmodels.AlertConfigurationVersion),
		OrgID:                     m.orgID,
		LastApplied:               time.Now().UTC().Unix(),
	}

	err = m.store.SaveAlertmanagerConfigurationWithCallback(ctx, cmd, func() error {
		return m.applyConfig(data)
	})
	return err
}

func (m MimirGrafanaAlertmanager) applyConfig(data []byte) error {
	err := m.sendRequest("POST", "/api/v1/alerts", bytes.NewReader(data), false, func(response *http.Response) error {
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to apply configuration: %w", err)
	}
	return nil
}

func (m MimirGrafanaAlertmanager) prepare(cfg *apimodels.PostableUserConfig) ([]byte, error) {
	decryptedReceivers := make([]*apimodels.PostableApiReceiver, 0, len(cfg.AlertmanagerConfig.Receivers))
	for _, rs := range cfg.AlertmanagerConfig.Receivers {
		decryptedReceiver := &apimodels.PostableApiReceiver{
			Receiver: rs.Receiver,
		}
		for _, r := range rs.GrafanaManagedReceivers {
			if len(r.SecureSettings) == 0 {
				decryptedReceiver.GrafanaManagedReceivers = append(decryptedReceiver.GrafanaManagedReceivers, r)
				continue
			}

			var data map[string]interface{}
			err := json.Unmarshal(r.Settings, &data)
			if err != nil {
				return nil, err // TODO More descriptive error
			}
			s := make(map[string][]byte, len(r.SecureSettings))
			for k, v := range r.SecureSettings {
				s[k], err = base64.StdEncoding.DecodeString(v)
				if err != nil {
					return nil, err
				}
			}

			for key := range r.SecureSettings {
				decrypted := m.decryptFn(context.Background(), s, key, "")
				if decrypted != "" {
					data[key] = decrypted
				}
			}

			decryptedRaw, err := json.Marshal(data)
			if err != nil {
				return nil, err
			}

			dr := &apimodels.PostableGrafanaReceiver{
				UID:                   r.UID,
				Name:                  r.Name,
				Type:                  r.Type,
				DisableResolveMessage: r.DisableResolveMessage,
				Settings:              decryptedRaw,
				SecureSettings:        nil,
			}
			decryptedReceiver.GrafanaManagedReceivers = append(decryptedReceiver.GrafanaManagedReceivers, dr)
		}
		decryptedReceivers = append(decryptedReceivers, decryptedReceiver)
	}
	// we do not support object matchers. Convert them back to regular until we figure something out

	configString, err := yaml.Marshal(alertmanagerConfig{
		Global:            cfg.AlertmanagerConfig.Global,
		Route:             cfg.AlertmanagerConfig.Route.AsAMRoute(),
		InhibitRules:      cfg.AlertmanagerConfig.InhibitRules,
		MuteTimeIntervals: cfg.AlertmanagerConfig.MuteTimeIntervals,
		Templates:         nil,
		GrafanaTemplates:  cfg.AlertmanagerConfig.Templates,
		Receivers:         decryptedReceivers,
	})

	mimirCfg := mimirMixedConfig{
		GrafanaTemplateFiles: cfg.TemplateFiles,
		AlertmanagerConfig:   string(configString),
	}
	data, err := yaml.Marshal(mimirCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to apply configuration: %w", err)
	}
	return data, nil
}

func (m MimirGrafanaAlertmanager) GetStatus() apimodels.GettableStatus {
	result := apimodels.GettableStatus{}
	err := m.sendRequest("GET", "/alertmanager/api/v2/status", nil, true, jsonExtractor(&result))
	if err != nil {
		m.logger.Error("Failed to fetch status", "error", err)
	}
	return result
}

func (m MimirGrafanaAlertmanager) CreateSilence(silenceBody *apimodels.PostableSilence) (string, error) {
	blob, err := json.Marshal(silenceBody)
	result := map[string]interface{}{}
	err = m.sendRequest("POST", "/alertmanager/api/v2/silences", bytes.NewReader(blob), true, jsonExtractor(&result))
	if err != nil {
		m.logger.Error("Failed to fetch status", "error", err)
		return "", err
	}
	id, ok := result["silenceID"]
	if !ok {
		m.logger.Error("Failed to parse silence create response. Cannot find field silenceID", "response", fmt.Sprintf("%v", result))
		return "", errors.New("failed to create silence")
	}
	return fmt.Sprintf("%v", id), nil
}

func (m MimirGrafanaAlertmanager) DeleteSilence(silenceID string) error {
	result := map[string]interface{}{}
	err := m.sendRequest("DELETE", fmt.Sprintf("/alertmanager/api/v2/silences/%s", silenceID), nil, true, jsonExtractor(&result))
	if err != nil {
		m.logger.Error("Failed to fetch status", "error", err)
		return err
	}
	return nil
}

func (m MimirGrafanaAlertmanager) GetSilence(silenceID string) (apimodels.GettableSilence, error) {
	result := apimodels.GettableSilence{}
	err := m.sendRequest("GET", fmt.Sprintf("/alertmanager/api/v2/silences/%s", silenceID), nil, true, jsonExtractor(&result))
	if err != nil {
		m.logger.Error("Failed to fetch status", "error", err)
		return apimodels.GettableSilence{}, err
	}
	return result, nil
}

func (m MimirGrafanaAlertmanager) ListSilences(filter []string) (apimodels.GettableSilences, error) {
	// TODO add filter later
	result := apimodels.GettableSilences{}
	err := m.sendRequest("GET", "/alertmanager/api/v2/silences", nil, true, jsonExtractor(&result))
	if err != nil {
		m.logger.Error("Failed to fetch status", "error", err)
		return nil, err
	}
	return result, nil
}

func (m MimirGrafanaAlertmanager) GetAlerts(active, silenced, inhibited bool, filter []string, receiver string) (apimodels.GettableAlerts, error) {
	// TODO add filter later
	result := apimodels.GettableAlerts{}
	err := m.sendRequest("GET", "/alertmanager/api/v2/alerts", nil, true, jsonExtractor(&result))
	if err != nil {
		m.logger.Error("Failed to fetch status", "error", err)
		return nil, err
	}
	return result, nil
}

func (m MimirGrafanaAlertmanager) GetAlertGroups(active, silenced, inhibited bool, filter []string, receiver string) (apimodels.AlertGroups, error) {
	result := apimodels.AlertGroups{}
	err := m.sendRequest("GET", "/alertmanager/api/v2/alerts/groups", nil, true, jsonExtractor(&result))
	if err != nil {
		m.logger.Error("Failed to fetch status", "error", err)
		return nil, err
	}
	return result, nil
}

func (m MimirGrafanaAlertmanager) GetReceivers(ctx context.Context) []apimodels.Receiver {
	return nil
}

func (m MimirGrafanaAlertmanager) TestReceivers(ctx context.Context, c apimodels.TestReceiversConfigBodyParams) (*TestReceiversResult, error) {
	return nil, errors.New("Not implemented")
}

// sendRequest proxies a different request
func (p *MimirGrafanaAlertmanager) sendRequest(method string, path string, body io.Reader, isJsonBody bool, extractor func(*http.Response) error) error {
	u := *p.url
	u.Path = path
	req, err := http.NewRequest(method, u.String(), body)
	if err != nil {
		return err
	}
	req.Header.Add("X-Scope-OrgID", fmt.Sprintf("%d", p.orgID))
	if isJsonBody {
		req.Header.Add("Content-Type", "application/json")
	}

	resp, err := p.client.Do(req)
	defer func() {
		_ = resp.Body.Close()
	}()
	status := resp.StatusCode

	if status >= 400 {
		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			return fmt.Errorf("failed to read response:%w", err)
		}
		p.logger.Error("got bad response", "code", status, "response", string(respBody))
		// if Content-Type is application/json
		// and it is successfully decoded and contains a message
		// return this as response error message
		if strings.HasPrefix(resp.Header.Get("Content-Type"), "application/json") {
			var m map[string]interface{}
			if err := json.Unmarshal(respBody, &m); err == nil {
				if message, ok := m["message"]; ok {
					errMessageStr, isString := message.(string)
					if isString {
						return errors.New(errMessageStr)
					}
				}
			}
		}
		return errors.New("unexpected response")
	}
	return extractor(resp)
}

func yamlExtractor(v interface{}) func(*http.Response) error {
	return func(resp *http.Response) error {
		contentType := resp.Header.Get("Content-Type")
		if !strings.Contains(contentType, "yaml") {
			return fmt.Errorf("unexpected content type from upstream. expected YAML, got %v", contentType)
		}
		defer func() {
			_ = resp.Body.Close()
		}()
		decoder := yaml.NewDecoder(resp.Body)
		decoder.KnownFields(true)

		err := decoder.Decode(v)

		return err
	}
}

func jsonExtractor(v interface{}) func(*http.Response) error {
	return func(resp *http.Response) error {
		contentType := resp.Header.Get("Content-Type")
		if !strings.Contains(contentType, "json") {
			return fmt.Errorf("unexpected content type from upstream. expected JSON, got %v", contentType)
		}
		dec := json.NewDecoder(resp.Body)
		return dec.Decode(v)
	}
}

type mimirMixedConfig struct {
	TemplateFiles        map[string]string `yaml:"template_files"`
	GrafanaTemplateFiles map[string]string `yaml:"grafana_template_files"`
	AlertmanagerConfig   string            `yaml:"alertmanager_config"`
}

type alertmanagerConfig struct {
	Global            *config.GlobalConfig      `yaml:"global,omitempty" json:"global,omitempty"`
	Route             *config.Route             `yaml:"route,omitempty" json:"route,omitempty"`
	InhibitRules      []config.InhibitRule      `yaml:"inhibit_rules,omitempty" json:"inhibit_rules,omitempty"`
	MuteTimeIntervals []config.MuteTimeInterval `yaml:"mute_time_intervals,omitempty" json:"mute_time_intervals,omitempty"`
	Templates         []string                  `yaml:"templates" json:"templates"`
	GrafanaTemplates  []string                  `yaml:"grafana_templates" json:"grafana_templates"`
	// Override with our superset receiver type
	Receivers []*apimodels.PostableApiReceiver `yaml:"receivers,omitempty" json:"receivers,omitempty"`
}

// ConvertAlerts sends a set of alerts to the configured Alertmanager(s).
func (s *MimirGrafanaAlertmanager) ConvertAlerts(alerts apimodels.PostableAlerts) []*notifier.Alert {
	if len(alerts.PostableAlerts) == 0 {
		return nil
	}
	as := make([]*notifier.Alert, 0, len(alerts.PostableAlerts))
	for _, a := range alerts.PostableAlerts {
		na := s.alertToNotifierAlert(a)
		as = append(as, na)
	}
	return as
}

func (s *MimirGrafanaAlertmanager) alertToNotifierAlert(alert models2.PostableAlert) *notifier.Alert {
	// Prometheus alertmanager has stricter rules for annotations/labels than grafana's internal alertmanager, so we sanitize invalid keys.
	return &notifier.Alert{
		Labels:       s.sanitizeLabelSet(alert.Alert.Labels),
		Annotations:  s.sanitizeLabelSet(alert.Annotations),
		StartsAt:     time.Time(alert.StartsAt),
		EndsAt:       time.Time(alert.EndsAt),
		GeneratorURL: alert.Alert.GeneratorURL.String(),
	}
}

// sanitizeLabelSet sanitizes all given LabelSet keys according to sanitizeLabelName.
// If there is a collision as a result of sanitization, a short (6 char) md5 hash of the original key will be added as a suffix.
func (s *MimirGrafanaAlertmanager) sanitizeLabelSet(lbls models2.LabelSet) labels.Labels {
	ls := make(labels.Labels, 0, len(lbls))
	set := make(map[string]struct{})

	// Must sanitize labels in order otherwise resulting label set can be inconsistent when there are collisions.
	for _, k := range sortedKeys(lbls) {
		sanitizedLabelName, err := s.sanitizeLabelName(k)
		if err != nil {
			s.logger.Error("Alert sending to external Alertmanager(s) contains an invalid label/annotation name that failed to sanitize, skipping", "name", k, "error", err)
			continue
		}

		// There can be label name collisions after we sanitize. We check for this and attempt to make the name unique again using a short hash of the original name.
		if _, ok := set[sanitizedLabelName]; ok {
			sanitizedLabelName = sanitizedLabelName + fmt.Sprintf("_%.3x", md5.Sum([]byte(k)))
			s.logger.Warn("Alert contains duplicate label/annotation name after sanitization, appending unique suffix", "name", k, "newName", sanitizedLabelName, "error", err)
		}

		set[sanitizedLabelName] = struct{}{}
		ls = append(ls, labels.Label{Name: sanitizedLabelName, Value: lbls[k]})
	}

	return ls
}

// sanitizeLabelName will fix a given label name so that it is compatible with prometheus alertmanager character restrictions.
// Prometheus alertmanager requires labels to match ^[a-zA-Z_][a-zA-Z0-9_]*$.
// Characters with an ASCII code < 127 will be replaced with an underscore (_), characters with ASCII code >= 127 will be replaced by their hex representation.
// For backwards compatibility, whitespace will be removed instead of replaced with an underscore.
func (s *MimirGrafanaAlertmanager) sanitizeLabelName(name string) (string, error) {
	if len(name) == 0 {
		return "", errors.New("label name cannot be empty")
	}

	if isValidLabelName(name) {
		return name, nil
	}

	s.logger.Warn("Alert sending to external Alertmanager(s) contains label/annotation name with invalid characters", "name", name)

	// Remove spaces. We do this instead of replacing with underscore for backwards compatibility as this existed before the rest of this function.
	sanitized := strings.Join(strings.Fields(name), "")

	// Replace other invalid characters.
	var buf strings.Builder
	for i, b := range sanitized {
		if isValidCharacter(i, b) {
			buf.WriteRune(b)
			continue
		}

		if b <= unicode.MaxASCII {
			buf.WriteRune('_')
			continue
		}

		if i == 0 {
			buf.WriteRune('_')
		}
		_, _ = fmt.Fprintf(&buf, "%#x", b)
	}

	if buf.Len() == 0 {
		return "", fmt.Errorf("label name is empty after removing invalids chars")
	}

	return buf.String(), nil
}

// isValidLabelName is true iff the label name matches the pattern of ^[a-zA-Z_][a-zA-Z0-9_]*$.
func isValidLabelName(ln string) bool {
	if len(ln) == 0 {
		return false
	}
	for i, b := range ln {
		if !isValidCharacter(i, b) {
			return false
		}
	}
	return true
}

// isValidCharacter checks if a specific rune is allowed at the given position in a label key for an external Prometheus alertmanager.
// From alertmanager LabelName.IsValid().
func isValidCharacter(pos int, b rune) bool {
	return (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z') || b == '_' || (b >= '0' && b <= '9' && pos > 0)
}

func sortedKeys(m map[string]string) []string {
	orderedKeys := make([]string, len(m))
	i := 0
	for k := range m {
		orderedKeys[i] = k
		i++
	}
	sort.Strings(orderedKeys)
	return orderedKeys
}
