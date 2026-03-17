package utils

import (
	"crypto/md5"
	"encoding/base64"
	"fmt"
)

// Md5 MD5 加密
func Md5(str string) string {
	h := md5.New()
	h.Write([]byte(str))
	return fmt.Sprintf("%x", h.Sum(nil))
}

// DoubleMd5 双重 MD5 加密 (与原项目一致)
func DoubleMd5(str string) string {
	return Md5(Md5(str))
}

// Base64Encode Base64 编码
func Base64Encode(str string) string {
	return base64.StdEncoding.EncodeToString([]byte(str))
}

// Base64Decode Base64 解码
func Base64Decode(str string) (string, error) {
	bytes, err := base64.StdEncoding.DecodeString(str)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}
