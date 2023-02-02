// this plugin is just re-exporting the Prometheus plugin but with a different "plugin.json" so we can have our own
// plugin in the UI with a custom name, logo, description, etc
export { plugin } from '../prometheus/module';
