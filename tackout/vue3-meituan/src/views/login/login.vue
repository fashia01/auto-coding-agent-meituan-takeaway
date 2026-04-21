<template>
  <div id="login">
    <v-head goBack="true" title="登录"></v-head>
    <form action="" class="login-form" @submit.prevent>
      <label class="form-label" for="username">
        <span class="label">账号</span>
        <input id="username" type="text" placeholder="请输入用户名" v-model="username">
      </label>
      <label class="form-label" for="password">
        <span class="label">密码</span>
        <input
          id="password"
          :type="passwordVisible ? 'text' : 'password'"
          placeholder="请输入密码"
          v-model="password"
          @keyup.enter="login">
        <span @click="changeVisible">
          <i class="iconfont icon" v-if="!passwordVisible">&#xe60a;</i>
          <i class="iconfont icon" v-else>&#xe6d0;</i>
        </span>
      </label>
      <div class="button" @click.stop="login()">
        <span>登录</span>
      </div>
      <span class="tip">未注册直接输入账号密码，自动注册！</span>
    </form>
    <alert-tip :text="alertText" v-model:showTip="showTip" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login as loginAPI } from '@/api/user'
import { setInfo } from '@/utils/auth'

const router = useRouter()

const username = ref(null)
const password = ref(null)
const passwordVisible = ref(false)
const alertText = ref('')
const showTip = ref(false)

function changeVisible() {
  passwordVisible.value = !passwordVisible.value
}

function login() {
  if (!username.value) {
    alertText.value = '用户名输入不合法'
    showTip.value = true
    return
  } else if (!password.value) {
    alertText.value = '密码不能为空'
    showTip.value = true
    return
  }
  loginAPI({ username: username.value, password: password.value }).then((response) => {
    if (response.data.status === 200) {
      setInfo(username.value)
      router.push('/home')
    } else {
      alertText.value = response.data.message
      showTip.value = true
    }
  }).catch((err) => {
    console.error('Login error:', err)
  })
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/common.scss";
@import "../../style/mixin.scss";

#login {
  .login-form {
    margin-top: 2rem;
    .form-label {
      display: flex;
      line-height: 1rem;
      margin: 0 0.4rem;
      .label {
        font-size: 0.4rem;
        margin-right: 0.2rem;
      }
      .icon {
        font-size: 0.4rem;
      }
      input {
        flex: 1;
        font-size: 0.4rem;
      }
      ::-webkit-input-placeholder {
        font-size: 0.4rem;
      }
      input:-webkit-autofill {
        -webkit-box-shadow: 0 0 0 1000px white inset !important;
      }
      input:focus {
        outline: none;
      }
    }
    .button {
      text-align: center;
      margin-top: 0.1rem;
      span {
        display: block;
        margin: 0 auto;
        color: #fff;
        width: 90%;
        font-size: 0.5rem;
        @include px2rem(line-height, 85);
        background: $mtYellow;
        border-radius: 0.3rem;
      }
    }
    .tip {
      font-size: 0.4rem;
      display: block;
      text-align: center;
      margin-top: 0.5rem;
    }
  }
}
</style>
