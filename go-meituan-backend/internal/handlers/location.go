package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/auto-coding-agent/meituan-backend/internal/config"
	"github.com/auto-coding-agent/meituan-backend/internal/utils"
	"github.com/gin-gonic/gin"
)

// GaodeLocationResponse 高德地图位置搜索响应
type GaodeLocationResponse struct {
	Status   string `json:"status"`
	Info     string `json:"info"`
	Count    int    `json:"count"`
	Geocodes []struct {
		Province string `json:"province"`
		City     string `json:"city"`
		District string `json:"district"`
		Street   string `json:"street"`
		Number   string `json:"number"`
		Location string `json:"location"`
	} `json:"geocodes"`
}

// GaodeGeoResponse 高德地图逆地理编码响应
type GaodeGeoResponse struct {
	Status   string `json:"status"`
	Info     string `json:"info"`
	ReGeocode struct {
		AddressComponent struct {
			Province string `json:"province"`
			City     string `json:"city"`
			District string `json:"district"`
		} `json:"addressComponent"`
		FormattedAddress string `json:"formatted_address"`
	} `json:"regeocode"`
}

// Suggestion 地址关键词搜索
func Suggestion(c *gin.Context) {
	keyword := c.Query("keyword")
	if keyword == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	if config.App == nil || config.App.Gaode.Key == "" {
		// 无配置，返回模拟数据
		c.JSON(200, gin.H{
			"status":  200,
			"message": "获取位置信息成功",
			"data": []gin.H{
				{
					"name": keyword + " (模拟)",
					"addr": "北京市朝阳区模拟街道123号",
					"lng":  "116.397428",
					"lat":  "39.90923",
				},
			},
		})
		return
	}

	url := fmt.Sprintf("https://restapi.amap.com/v3/place/text?key=%s&keywords=%s&types=商务住宅&city=beijing&offset=10&page=1&extensions=all",
		config.App.Gaode.Key, keyword)

	resp, err := http.Get(url)
	if err != nil {
		utils.ServerError(c, "获取位置信息失败")
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result GaodeLocationResponse
	json.Unmarshal(body, &result)

	if result.Status != "1" {
		utils.ServerError(c, "获取位置信息失败")
		return
	}

	var data []gin.H
	for _, g := range result.Geocodes {
		var lng, lat string
		fmt.Sscanf(g.Location, "%[^,],%s", &lng, &lat)
		data = append(data, gin.H{
			"name": g.Province + g.City + g.District + g.Street + g.Number,
			"addr": g.Province + g.City + g.District + g.Street + g.Number,
			"lng":  lng,
			"lat":  lat,
		})
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "获取位置信息成功",
		"data":    data,
	})
}

// Location 获取当前位置
func Location(c *gin.Context) {
	// 从请求中获取坐标
	lat := c.Query("lat")
	lng := c.Query("lng")

	// 如果没有提供坐标，返回默认位置
	if lat == "" || lng == "" {
		lat = "23.02067"
		lng = "113.75179"
	}

	// 如果有高德地图配置，进行逆地理编码
	if config.App != nil && config.App.Gaode.Key != "" {
		url := fmt.Sprintf("https://restapi.amap.com/v3/geocode/regeo?key=%s&location=%s,%s&extensions=all",
			config.App.Gaode.Key, lng, lat)

		resp, err := http.Get(url)
		if err == nil {
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)

			var result GaodeGeoResponse
			json.Unmarshal(body, &result)

			if result.Status == "1" {
				c.JSON(200, gin.H{
					"status": 200,
					"message": "获取位置信息成功",
					"data": gin.H{
						"lat":       lat,
						"lng":       lng,
						"city":      result.ReGeocode.AddressComponent.City,
						"province":  result.ReGeocode.AddressComponent.Province,
						"district":  result.ReGeocode.AddressComponent.District,
						"address":   result.ReGeocode.FormattedAddress,
					},
				})
				return
			}
		}
	}

	// 返回默认或模拟数据
	c.JSON(200, gin.H{
		"status": 200,
		"message": "获取位置信息成功",
		"data": gin.H{
			"lat":       lat,
			"lng":       lng,
			"city":      "东莞市",
			"province":  "广东省",
			"district":  "南城区",
			"address":   "广东省东莞市南城区",
		},
	})
}

// DetailLocation 获取详细位置
func DetailLocation(c *gin.Context) {
	location := c.Query("location")
	if location == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	// 解析坐标
	var lng, lat string
	fmt.Sscanf(location, "%[^,],%s", &lng, &lat)

	if config.App != nil && config.App.Gaode.Key != "" {
		url := fmt.Sprintf("https://restapi.amap.com/v3/geocode/regeo?key=%s&location=%s,%s&extensions=all",
			config.App.Gaode.Key, lng, lat)

		resp, err := http.Get(url)
		if err == nil {
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)

			var result GaodeGeoResponse
			json.Unmarshal(body, &result)

			if result.Status == "1" {
				c.JSON(200, gin.H{
					"status": 200,
					"message": "获取位置信息成功",
					"data": gin.H{
						"lat":       lat,
						"lng":       lng,
						"city":      result.ReGeocode.AddressComponent.City,
						"province":  result.ReGeocode.AddressComponent.Province,
						"district":  result.ReGeocode.AddressComponent.District,
						"address":   result.ReGeocode.FormattedAddress,
					},
				})
				return
			}
		}
	}

	// 返回模拟数据
	c.JSON(200, gin.H{
		"status": 200,
		"message": "获取位置信息成功",
		"data": gin.H{
			"lat":       lat,
			"lng":       lng,
			"city":      "东莞市",
			"province":  "广东省",
			"district":  "南城区",
			"address":   "广东省东莞市南城区",
		},
	})
}

// LocationSearch 地址搜索 (内部函数)
func LocationSearch(keyword string) ([]gin.H, error) {
	var data []gin.H

	if config.App == nil || config.App.Gaode.Key == "" {
		// 无配置，返回模拟数据
		data = append(data, gin.H{
			"name": keyword + " (模拟)",
			"addr": "北京市朝阳区模拟街道123号",
			"lng":  "116.397428",
			"lat":  "39.90923",
		})
		return data, nil
	}

	url := fmt.Sprintf("https://restapi.amap.com/v3/place/text?key=%s&keywords=%s&types=商务住宅&city=beijing&offset=10&page=1&extensions=all",
		config.App.Gaode.Key, keyword)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result GaodeLocationResponse
	json.Unmarshal(body, &result)

	if result.Status != "1" {
		return nil, fmt.Errorf("API error: %s", result.Info)
	}

	for _, g := range result.Geocodes {
		var lng, lat string
		fmt.Sscanf(g.Location, "%[^,],%s", &lng, &lat)
		data = append(data, gin.H{
			"name": g.Province + g.City + g.District + g.Street + g.Number,
			"addr": g.Province + g.City + g.District + g.Street + g.Number,
			"lng":  lng,
			"lat":  lat,
		})
	}

	return data, nil
}
