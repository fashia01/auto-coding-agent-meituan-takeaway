package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server       ServerConfig   `yaml:"server"`
	Database     DatabaseConfig `yaml:"database"`
	Redis        RedisConfig    `yaml:"redis"`
	Session      SessionConfig  `yaml:"session"`
	Qiniu        QiniuConfig    `yaml:"qiniu"`
	Gaode        GaodeConfig    `yaml:"gaode"`
	Wechat       WechatConfig   `yaml:"wechat"`
	MockPayment bool           `yaml:"mock_payment"`
}

type ServerConfig struct {
	Port int    `yaml:"port"`
	Mode string `yaml:"mode"`
}

type DatabaseConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	Name     string `yaml:"name"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
}

type RedisConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	Password string `yaml:"password"`
	DB       int    `yaml:"db"`
}

type SessionConfig struct {
	Secret string `yaml:"secret"`
	MaxAge int    `yaml:"max_age"`
}

type QiniuConfig struct {
	AccessKey string `yaml:"access_key"`
	SecretKey string `yaml:"secret_key"`
	Bucket    string `yaml:"bucket"`
	Domain    string `yaml:"domain"`
}

type GaodeConfig struct {
	Key string `yaml:"key"`
}

type WechatConfig struct {
	Appid  string `yaml:"appid"`
	Secret string `yaml:"secret"`
}

var App *Config

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	App = &cfg
	return &cfg, nil
}

func (c *DatabaseConfig) GetURI() string {
	if c.Username != "" && c.Password != "" {
		return fmt.Sprintf("mongodb://%s:%s@%s:%d", c.Username, c.Password, c.Host, c.Port)
	}
	return fmt.Sprintf("mongodb://%s:%d", c.Host, c.Port)
}
