package service

import (
	"context"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/registry"
	"github.com/grafana/grafana/pkg/server/k8s/builder"
	openapi "github.com/grafana/grafana/pkg/server/k8s/generated"
	"github.com/grafana/grafana/pkg/server/k8s/options"
	"github.com/grafana/grafana/pkg/server/k8s/start"
)

func ProvideService() *Service {
	return &Service{
		log: log.New("k8s-service"),
	}
}

type Service struct {
	registry.BackgroundService
	log log.Logger
}

func (s *Service) Run(ctx context.Context) error {
	port := 9444

	s.log.Info("Starting k8s apiserver", "port", port)
	apiserverBuilder := builder.NewServerBuilder().
		WithResourceFileStorage(&start.Manifest{}, "data/k8s/crds").
		//WithBearerToken("embedded-k8s-token").
		WithOpenAPIDefinitions("tilt", "0.1.0", openapi.GetOpenAPIDefinitions).
		WithBindPort(port).
		WithCertKey(options.GeneratableKeyCert{
			CertDirectory: "data/k8s/certs",
			PairName:      "embedded-k8s",
		})

	apiserverOptions, err := apiserverBuilder.ToServerOptions()
	if err != nil {
		panic(err)
	}
	serverCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	config, err := apiserverOptions.Config()
	if err != nil {
		panic(err)
	}

	ch, err := apiserverOptions.RunTiltServerFromConfig(config.Complete(), serverCtx)
	if err != nil {
		panic(err)
	}

	for {
		select {
		case <-ctx.Done():
			s.log.Debug("Grafana is shutting down - stopping k8s apiserver")
			cancel()
			return nil
		case <-ch:
			return nil
		}
	}
}
