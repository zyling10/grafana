package supportbundlestest

import "github.com/grafana/grafana/pkg/services/supportbundles"

type FakeSupportBundles struct {
}

func NewFakeSupportBundles() *FakeSupportBundles {
	return &FakeSupportBundles{}
}

func (f *FakeSupportBundles) RegisterSupportItemCollector(collector supportbundles.Collector) {}
