package plugincontext

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"

	"github.com/grafana/grafana/pkg/infra/localcache"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/adapters"
	"github.com/grafana/grafana/pkg/services/datasources"
	"github.com/grafana/grafana/pkg/services/pluginsettings"
	"github.com/grafana/grafana/pkg/services/supportbundles"
	"github.com/grafana/grafana/pkg/services/user"
)

func ProvideService(cacheService *localcache.CacheService, pluginStore plugins.Store,
	dataSourceCache datasources.CacheService, dataSourceService datasources.DataSourceService,
	pluginSettingsService pluginsettings.Service, supportBundles supportbundles.Service) *Provider {
	p := &Provider{
		cacheService:          cacheService,
		pluginStore:           pluginStore,
		dataSourceCache:       dataSourceCache,
		dataSourceService:     dataSourceService,
		pluginSettingsService: pluginSettingsService,
		logger:                log.New("plugincontext"),
	}

	supportBundles.RegisterSupportItemCollector(p.pluginInfoCollector())

	return p
}

type Provider struct {
	cacheService          *localcache.CacheService
	pluginStore           plugins.Store
	dataSourceCache       datasources.CacheService
	dataSourceService     datasources.DataSourceService
	pluginSettingsService pluginsettings.Service
	logger                log.Logger
}

// Get allows getting plugin context by its ID. If datasourceUID is not empty string
// then PluginContext.DataSourceInstanceSettings will be resolved and appended to
// returned context.
func (p *Provider) Get(ctx context.Context, pluginID string, user *user.SignedInUser) (backend.PluginContext, bool, error) {
	return p.pluginContext(ctx, pluginID, user)
}

// GetWithDataSource allows getting plugin context by its ID and PluginContext.DataSourceInstanceSettings will be
// resolved and appended to the returned context.
func (p *Provider) GetWithDataSource(ctx context.Context, pluginID string, user *user.SignedInUser, ds *datasources.DataSource) (backend.PluginContext, bool, error) {
	pCtx, exists, err := p.pluginContext(ctx, pluginID, user)
	if err != nil {
		return pCtx, exists, err
	}

	datasourceSettings, err := adapters.ModelToInstanceSettings(ds, p.decryptSecureJsonDataFn(ctx))
	if err != nil {
		return pCtx, exists, fmt.Errorf("%v: %w", "Failed to convert datasource", err)
	}
	pCtx.DataSourceInstanceSettings = datasourceSettings

	return pCtx, true, nil
}

const pluginSettingsCacheTTL = 5 * time.Second
const pluginSettingsCachePrefix = "plugin-setting-"

func (p *Provider) pluginContext(ctx context.Context, pluginID string, user *user.SignedInUser) (backend.PluginContext, bool, error) {
	plugin, exists := p.pluginStore.Plugin(ctx, pluginID)
	if !exists {
		return backend.PluginContext{}, false, nil
	}

	jsonData := json.RawMessage{}
	decryptedSecureJSONData := map[string]string{}
	var updated time.Time

	ps, err := p.getCachedPluginSettings(ctx, pluginID, user)
	if err != nil {
		// pluginsettings.ErrPluginSettingNotFound is expected if there's no row found for plugin setting in database (if non-app plugin).
		// If it's not this expected error something is wrong with cache or database and we return the error to the client.
		if !errors.Is(err, pluginsettings.ErrPluginSettingNotFound) {
			return backend.PluginContext{}, false, fmt.Errorf("%v: %w", "Failed to get plugin settings", err)
		}
	} else {
		jsonData, err = json.Marshal(ps.JSONData)
		if err != nil {
			return backend.PluginContext{}, false, fmt.Errorf("%v: %w", "Failed to unmarshal plugin json data", err)
		}
		decryptedSecureJSONData = p.pluginSettingsService.DecryptedValues(ps)
		updated = ps.Updated
	}

	return backend.PluginContext{
		OrgID:    user.OrgID,
		PluginID: plugin.ID,
		User:     adapters.BackendUserFromSignedInUser(user),
		AppInstanceSettings: &backend.AppInstanceSettings{
			JSONData:                jsonData,
			DecryptedSecureJSONData: decryptedSecureJSONData,
			Updated:                 updated,
		},
	}, true, nil
}

func (p *Provider) getCachedPluginSettings(ctx context.Context, pluginID string, user *user.SignedInUser) (*pluginsettings.DTO, error) {
	cacheKey := pluginSettingsCachePrefix + pluginID

	if cached, found := p.cacheService.Get(cacheKey); found {
		ps := cached.(*pluginsettings.DTO)
		if ps.OrgID == user.OrgID {
			return ps, nil
		}
	}

	ps, err := p.pluginSettingsService.GetPluginSettingByPluginID(ctx, &pluginsettings.GetByPluginIDArgs{
		PluginID: pluginID,
		OrgID:    user.OrgID,
	})
	if err != nil {
		return nil, err
	}

	p.cacheService.Set(cacheKey, ps, pluginSettingsCacheTTL)
	return ps, nil
}

func (p *Provider) decryptSecureJsonDataFn(ctx context.Context) func(ds *datasources.DataSource) (map[string]string, error) {
	return func(ds *datasources.DataSource) (map[string]string, error) {
		return p.dataSourceService.DecryptedValues(ctx, ds)
	}
}

func (p *Provider) pluginInfoCollector() supportbundles.Collector {
	return supportbundles.Collector{
		UID:               "plugins",
		DisplayName:       "Plugin information",
		Description:       "Plugin information for the Grafana instance",
		IncludedByDefault: false,
		Default:           true,
		Fn: func(ctx context.Context) (*supportbundles.SupportItem, error) {
			type pluginInfo struct {
				data  plugins.JSONData
				Class plugins.Class

				// App fields
				IncludedInAppID string
				DefaultNavURL   string
				Pinned          bool

				// Signature fields
				Signature plugins.SignatureStatus

				// SystemJS fields
				Module  string
				BaseURL string

				PluginVersion string
				Enabled       bool
				Updated       time.Time
			}

			plugins := p.pluginStore.Plugins(context.Background())

			var pluginInfoList []pluginInfo
			for _, plugin := range plugins {
				// skip builtin plugins
				if plugin.BuiltIn {
					continue
				}

				pInfo := pluginInfo{
					data:            plugin.JSONData,
					Class:           plugin.Class,
					IncludedInAppID: plugin.IncludedInAppID,
					DefaultNavURL:   plugin.DefaultNavURL,
					Pinned:          plugin.Pinned,
					Signature:       plugin.Signature,
					Module:          plugin.Module,
					BaseURL:         plugin.BaseURL,
				}

				// TODO need to loop through all the orgs
				// TODO ignore the error for now, not all plugins have settings
				settings, err := p.pluginSettingsService.GetPluginSettingByPluginID(context.Background(), &pluginsettings.GetByPluginIDArgs{PluginID: plugin.ID, OrgID: 1})
				if err == nil {
					pInfo.PluginVersion = settings.PluginVersion
					pInfo.Enabled = settings.Enabled
					pInfo.Updated = settings.Updated
				}

				pluginInfoList = append(pluginInfoList, pInfo)
			}

			data, err := json.Marshal(pluginInfoList)
			if err != nil {
				return nil, err
			}
			return &supportbundles.SupportItem{
				Filename:  "plugins.json",
				FileBytes: data,
			}, nil
		},
	}
}
