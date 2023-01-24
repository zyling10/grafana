package frontendroutes

import (
	"github.com/grafana/grafana/pkg/api"
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/supportbundles/supportbundlesimpl"
)

type DeclareFrontendRoute interface {
	RegisterFrontendRoutes(routeRegister routing.RouteRegister, IndexView func(c *models.ReqContext))
}

type FrontendRoutesRegistry struct {
}

func ProvideFrontendRoutesRegistry(routeRegister routing.RouteRegister, httpServer *api.HTTPServer, supportBundles *supportbundlesimpl.Service) *FrontendRoutesRegistry {
	reg := []DeclareFrontendRoute{
		supportBundles,
	}

	for i := range reg {
		reg[i].RegisterFrontendRoutes(routeRegister, httpServer.Index)
	}

	return &FrontendRoutesRegistry{}
}
