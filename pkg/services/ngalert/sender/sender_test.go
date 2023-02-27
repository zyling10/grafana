package sender

import (
	"encoding/base64"
	"fmt"
	"net/url"
	"testing"

	"github.com/prometheus/alertmanager/api/v2/models"
	"github.com/prometheus/prometheus/pkg/labels"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSanitizeLabelName(t *testing.T) {
	cases := []struct {
		desc           string
		labelName      string
		expectedResult string
		expectedErr    string
	}{
		{
			desc:           "Remove whitespace",
			labelName:      "   a\tb\nc\vd\re\ff   ",
			expectedResult: "abcdef",
		},
		{
			desc:           "Replace ASCII with underscore",
			labelName:      " !\"#$%&\\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~",
			expectedResult: "________________0123456789_______ABCDEFGHIJKLMNOPQRSTUVWXYZ______abcdefghijklmnopqrstuvwxyz____",
		},
		{
			desc:           "Replace non-ASCII unicode with hex",
			labelName:      "_€_ƒ_„_†_‡_œ_Ÿ_®_º_¼_×_ð_þ_¿_±_四_十_二_🔥",
			expectedResult: "_0x20ac_0x192_0x201e_0x2020_0x2021_0x153_0x178_0xae_0xba_0xbc_0xd7_0xf0_0xfe_0xbf_0xb1_0x56db_0x5341_0x4e8c_0x1f525",
		},
		{ // labels starting with a number are invalid, so we have to make sure we don't sanitize to another invalid label.
			desc:           "If first character is replaced with hex, prefix with underscore",
			labelName:      "😍😍😍",
			expectedResult: "_0x1f60d0x1f60d0x1f60d",
		},
		{
			desc:        "Empty string should error",
			labelName:   "",
			expectedErr: "label name cannot be empty",
		},
		{
			desc:        "Only whitespace should error",
			labelName:   "   \t\n\v\n\f   ",
			expectedErr: "label name is empty after removing invalids chars",
		},
	}

	for _, tc := range cases {
		am := NewExternalAlertmanagerSender()
		t.Run(tc.desc, func(t *testing.T) {
			res, err := am.sanitizeLabelName(tc.labelName)

			if tc.expectedErr != "" {
				require.EqualError(t, err, tc.expectedErr)
			}

			require.Equal(t, tc.expectedResult, res)
		})
	}
}

func TestSanitizeLabelSet(t *testing.T) {
	cases := []struct {
		desc           string
		labelset       models.LabelSet
		expectedResult labels.Labels
	}{
		{
			desc: "Duplicate labels after sanitizations, append short has as suffix to duplicates",
			labelset: models.LabelSet{
				"test-alert": "42",
				"test_alert": "43",
				"test+alert": "44",
			},
			expectedResult: labels.Labels{
				labels.Label{Name: "test_alert", Value: "44"},
				labels.Label{Name: "test_alert_ed6237", Value: "42"},
				labels.Label{Name: "test_alert_a67b5e", Value: "43"},
			},
		},
		{
			desc: "If sanitize fails for a label, skip it",
			labelset: models.LabelSet{
				"test-alert":       "42",
				"   \t\n\v\n\f   ": "43",
				"test+alert":       "44",
			},
			expectedResult: labels.Labels{
				labels.Label{Name: "test_alert", Value: "44"},
				labels.Label{Name: "test_alert_ed6237", Value: "42"},
			},
		},
	}

	for _, tc := range cases {
		am := NewExternalAlertmanagerSender()
		t.Run(tc.desc, func(t *testing.T) {
			require.Equal(t, tc.expectedResult, am.sanitizeLabelSet(tc.labelset))
		})
	}
}

func TestPathWithHeaders(t *testing.T) {
	testCases := []struct {
		name     string
		url      string
		headers  map[string]string
		expected string
	}{
		{
			name:     "returns url empty path if no headers",
			url:      "http://localhost",
			expected: "",
		},
		{
			name:     "returns url path if no headers",
			url:      "http://localhost/test",
			expected: "/test",
		},
		{
			name: "add headers to empty path as json object",
			url:  "http://localhost",
			headers: map[string]string{
				"header-1": "header-value",
			},
			expected: "/headers-eyJoZWFkZXItMSI6ImhlYWRlci12YWx1ZSJ9",
		},
		{
			name: "add headers to path as json object",
			url:  "http://localhost/test-path",
			headers: map[string]string{
				"header-1":   "header-value",
				"HEADER-KEY": "header-VALUE",
			},
			expected: "/headers-eyJIRUFERVItS0VZIjoiaGVhZGVyLVZBTFVFIiwiaGVhZGVyLTEiOiJoZWFkZXItdmFsdWUifQ==/test-path",
		},
	}

	for _, c := range testCases {
		t.Run(c.name, func(t *testing.T) {
			u, err := url.Parse(c.url)
			require.NoError(t, err)
			path, err := pathWithHeaders(c.headers, u)
			require.NoError(t, err)
			require.Equal(t, c.expected, path)
		})
	}
}

func TestExtractHeadersFromUrl(t *testing.T) {
	parseUrl := func(u string) *url.URL {
		parsed, err := url.Parse(u)
		if err != nil {
			panic(err)
		}
		return parsed
	}

	invalidJsonEncoded := base64.StdEncoding.EncodeToString([]byte(`{ "test": 1 }`))

	testCases := []struct {
		name            string
		url             *url.URL
		expectedHeaders map[string]string
		expectedURL     *url.URL
	}{
		{
			name:            "should do nothing if no path",
			url:             parseUrl("http://localhost:8080"),
			expectedHeaders: nil,
			expectedURL:     parseUrl("http://localhost:8080"),
		},
		{
			name:            "should do nothing if regular url",
			url:             parseUrl("http://localhost:8080/test-path"),
			expectedHeaders: nil,
			expectedURL:     parseUrl("http://localhost:8080/test-path"),
		},
		{
			name:            "should do nothing if no prefix url",
			url:             parseUrl("http://localhost:8080/eyJoZWFkZXItMSI6ImhlYWRlci12YWx1ZSJ9/test-path"),
			expectedHeaders: nil,
			expectedURL:     parseUrl("http://localhost:8080/eyJoZWFkZXItMSI6ImhlYWRlci12YWx1ZSJ9/test-path"),
		},
		{
			name:            "should do nothing if no prefix url",
			url:             parseUrl("http://localhost:8080/headers-/test-path"),
			expectedHeaders: nil,
			expectedURL:     parseUrl("http://localhost:8080/headers-/test-path"),
		},
		{
			name:            "should do nothing if invalid base64 after prefix",
			url:             parseUrl("http://localhost:8080/headers-test/test-path"),
			expectedHeaders: nil,
			expectedURL:     parseUrl("http://localhost:8080/headers-test/test-path"),
		},
		{
			name:            "should do nothing if invalid base64 after prefix",
			url:             parseUrl(fmt.Sprintf("http://localhost:8080/headers-%s/test-path", invalidJsonEncoded)),
			expectedHeaders: nil,
			expectedURL:     parseUrl(fmt.Sprintf("http://localhost:8080/headers-%s/test-path", invalidJsonEncoded)),
		},
		{
			name: "should extract headers from path",
			url:  parseUrl("http://localhost:8080/headers-eyJIRUFERVItS0VZIjoiaGVhZGVyLVZBTFVFIiwiaGVhZGVyLTEiOiJoZWFkZXItdmFsdWUifQ==/test-path"),
			expectedHeaders: map[string]string{
				"header-1":   "header-value",
				"HEADER-KEY": "header-VALUE",
			},
			expectedURL: parseUrl("http://localhost:8080/test-path"),
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			actualUrl, actualHeaders, err := extractHeadersFromUrl(tc.url)
			require.NoError(t, err)
			assert.Equal(t, tc.expectedURL.String(), actualUrl.String())
			assert.Equal(t, tc.expectedHeaders, actualHeaders)
		})
	}
}
