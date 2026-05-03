<template>
  <div id="home">
    <v-head title="我的" goBack="true"></v-head>
    <div id="user-info">
      <label class="avatar" for="file">
        <img :src="avatar">
        <input id="file" type="file" @change="fileUpload($event)" style="display: none;">
      </label>
      <router-link v-if="!username" class="login" to="/login">登录/注册</router-link>
      <span v-else class="username">{{ username }}</span>
    </div>
    <div class="fun-container">
      <ul>
        <li v-for="(item, index) in myFunList" :key="index" @click="routerChange(item.url)">
          <div class="img-wrap">
            <img :src="item.picUrl">
          </div>
          <span>{{ item.name }}</span>
        </li>
      </ul>
    </div>
    <div class="assets">
      <h3>我的资产</h3>
      <ul>
        <li v-for="(item, index) in myAssetsList" :key="index" @click="item.url && routerChange(item.url)">
          <div class="img"><img :src="item.picUrl"></div>
          <span>{{ item.name }}</span>
          <span v-if="item.badge" class="asset-badge">{{ item.badge }}</span>
        </li>
      </ul>
    </div>
    <div class="intro">
      <h3>更多推荐</h3>
      <ul>
        <li v-for="(item, index) in introList" :key="index">
          <div class="img"><img :src="item.picUrl"></div>
          <span>{{ item.name }}</span>
        </li>
      </ul>
    </div>

    <!-- 邀请好友入口 -->
    <div class="invite-banner" @click="showInvitePopup = true">
      <span class="invite-icon">🎁</span>
      <div class="invite-text">
        <span class="invite-title">邀请好友，双方得奖励</span>
        <span class="invite-sub">已邀请 {{ inviteCount }} 位好友</span>
      </div>
      <span class="invite-arrow">›</span>
    </div>

    <!-- 邀请码弹窗 -->
    <van-popup v-model:show="showInvitePopup" round position="bottom" style="padding: 0.4rem 0.3rem 1rem;">
      <h3 style="text-align:center;font-size:0.36rem;margin-bottom:0.3rem;">🎁 邀请好友</h3>
      <p style="text-align:center;color:#666;font-size:0.28rem;margin-bottom:0.3rem;">好友通过您的链接注册并完成首单，双方各获得满20减3券</p>
      <div style="background:#f9f9f9;border-radius:0.12rem;padding:0.2rem 0.3rem;text-align:center;margin-bottom:0.2rem;">
        <span style="font-size:0.28rem;color:#999;">专属邀请链接</span><br>
        <span style="font-size:0.26rem;color:#333;word-break:break-all;">#/login?invite={{ inviteCode }}</span>
      </div>
      <van-button block color="#ffd161" style="color:#333;font-weight:bold;" @click="copyInviteLink">复制链接</van-button>
    </van-popup>
    <v-bottom></v-bottom>
    <router-view></router-view>
    <v-loading v-show="loading"></v-loading>
    <alert-tip :text="alertText" v-model:showTip="showTip" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { userInfo, changeAvatar } from '@/api/user'
import { getInfo } from '@/utils/auth'
import { uploadToken, upload } from '@/api/upload'
import config from '@/config'
import VLoading from '@/components/loading.vue'
import { showToast } from 'vant'

const router = useRouter()

const username = ref(null)
const avatar = ref('http://i.waimai.meituan.com/static/img/default-avatar.png')
const loading = ref(false)
const alertText = ref('')
const showTip = ref(false)
const pointsBalance = ref(0)

async function fetchPointsBalance() {
  try {
    const r = await fetch('http://localhost:3000/v1/points/account', { credentials: 'include' })
    const j = await r.json()
    if (j.status === 200) pointsBalance.value = j.data.balance || 0
  } catch (e) {}
}

const myFunList = [
  { url: '/my_collection', picUrl: 'http://p1.meituan.net/50.0.100/xianfu/9c1388ba5fbb367c1a93996f39c2fba94506.jpg', name: '我的收藏' },
  { url: '/my_footprint', picUrl: 'http://p1.meituan.net/50.0.100/xianfu/7ad7da19bfadd5e6081b7606025214254582.jpg', name: '我的足迹' },
  { url: '/my_comment', picUrl: 'http://p0.meituan.net/50.0.100/xianfu/5d02f44df0f9f26ea0eca95957824bae4444.jpg', name: '我的评价' },
  { url: '/home/friend', picUrl: 'http://p1.meituan.net/50.0.100/xianfu/bbae84a587711ac12badb9453406ad694851.jpg', name: '我的好友' },
  { url: '/home/thank', picUrl: 'http://p1.meituan.net/50.0.100/xianfu/5c1bf832376403ca2ab22b8d8748e0fd5479.jpg', name: '答谢记录' },
  { url: '/home/address', picUrl: 'http://p0.meituan.net/50.0.100/xianfu/a813bff1813024b05ff45422deac24bd4276.jpg', name: '我的地址' }
]

// 邀请信息
const inviteCode = ref('')
const inviteCount = ref(0)
const showInvitePopup = ref(false)

async function fetchInviteInfo() {
  try {
    const r = await fetch('http://localhost:3000/admin/invite_info', { credentials: 'include' })
    const j = await r.json()
    if (j.status === 200) {
      inviteCode.value = j.data.invite_code
      inviteCount.value = j.data.invite_count
    }
  } catch (e) {}
}

const myAssetsList = computed(() => [
  { name: '红包', picUrl: 'http://p1.meituan.net/50.0.100/xianfu/a361ce97f9f00f2715bb960a789d925e2315.jpg' },
  { name: '代金券', picUrl: 'http://p0.meituan.net/50.0.100/xianfu/875f13a76045b7f6862a2b7149babec32329.jpg' },
  { name: '我的积分', picUrl: 'http://p1.meituan.net/50.0.100/xianfu/2c14b3425c7bf1f3d63d11f47a7ef9ea2230.jpg', url: '/points', badge: pointsBalance.value > 0 ? String(pointsBalance.value) : null },
  { name: '余额', picUrl: 'http://p0.meituan.net/50.0.100/xianfu/7b3e3fb4fc9b45dcda74d7e916f025ea2878.jpg' }
])

const introList = [
  { picUrl: 'http://p0.meituan.net/50.0.100/xianfu/cf5ddfcae114ed8d7d147d51064532252477.jpg', name: '邀请有奖' },
  { picUrl: 'http://p1.meituan.net/50.0.100/xianfu/55748d5fa531a057258f68d029fe20542466.jpg', name: '商家入驻' },
  { picUrl: 'http://p1.meituan.net/50.0.100/xianfu/317aabdd31dfcfa1739149089a2e041a2780.jpg', name: '帮助与反馈' },
  { picUrl: 'http://p0.meituan.net/50.0.100/xianfu/55454d4faaed6ad212b2b8a929edef372425.jpg', name: '在线客服' }
]

function fileUpload(event) {
  loading.value = true
  const file = event.target.files[0]
  if (file.size > 1024 * 1024 * 3) {
    alertText.value = '上传失败，只能传2M以内图片'
    showTip.value = true
  } else {
    uploadToken().then((response) => {
      if (response.data.status === 200) {
        const data = { token: response.data.uptoken, file }
        upload(data).then((upResponse) => {
          const pic_url = config.domain + upResponse.data.key
          avatar.value = pic_url
          loading.value = false
          changeAvatar({ pic_url })
        })
      } else {
        alertText.value = response.data.message
        showTip.value = true
      }
    })
  }
}

function routerChange(url) {
  if (username.value) {
    router.push(url)
  } else {
    router.push('/login')
  }
}

onMounted(() => {
  username.value = getInfo()
  if (username.value) {
    userInfo().then((response) => {
      avatar.value = response.data.avatar
    })
  }
  fetchPointsBalance()
  fetchInviteInfo()
})

async function copyInviteLink() {
  const link = `${window.location.origin}${window.location.pathname}#/login?invite=${inviteCode.value}`
  try { await navigator.clipboard.writeText(link) } catch (e) {}
  showToast({ message: '✅ 已复制邀请链接', position: 'bottom' })
  showInvitePopup.value = false
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/common.scss";
@import "../../style/mixin.scss";

#home { height: 100%; background: rgb(244, 244, 244); }
#user-info {
  @include px2rem(height, 200); color: #000; display: flex; align-items: center; background: #fff;
  .avatar { @include px2rem(width, 115); @include px2rem(height, 115); text-align: center; margin: 0 0.8rem; border-radius: 50%; overflow: hidden; border: 1px solid #333; img { width: 100%; height: 100%; } }
  .login { font-size: 0.45rem; }
  .username { font-size: 0.5rem; }
}
.fun-container {
  margin-top: 0.3rem; background: #fff;
  ul { @include clearfix; li { width: 25%; @include px2rem(height, 145); float: left; text-align: center; margin: 0.2rem 0; .img-wrap { @include px2rem(width, 70); @include px2rem(height, 70); margin: 0.1rem auto; img { width: 100%; height: 100%; } } span { font-size: 0.35rem; } } }
}
.assets, .intro {
  margin-top: 0.2rem; background: #fff;
  h3 { font-size: 0.5rem; margin-left: 0.3rem; padding-top: 0.3rem; padding-bottom: 0.2rem; border-bottom: 1px solid $bottomLine; }
  ul { display: flex; padding: 0.3rem 0;
    li { flex: 1; text-align: center; position: relative; cursor: pointer;
      .img { @include px2rem(width, 55); @include px2rem(height, 55); margin: 0.1rem auto; img { width: 100%; height: 100%; } }
      span { font-size: 0.35rem; }
      .asset-badge {
        position: absolute; top: 0; right: 0.1rem;
        background: #f60; color: #fff; font-size: 0.2rem;
        padding: 0.02rem 0.08rem; border-radius: 0.2rem; font-weight: bold;
      }
    }
  }
}
.intro { padding-bottom: 1rem; }
.invite-banner {
  margin: 0.2rem 0; background: linear-gradient(135deg, #fff8f0, #fff);
  border-top: 1px solid #ffe8cc; border-bottom: 1px solid #ffe8cc;
  padding: 0.24rem 0.3rem; display: flex; align-items: center; gap: 0.2rem; cursor: pointer;
  .invite-icon { font-size: 0.5rem; }
  .invite-text { flex: 1; display: flex; flex-direction: column; gap: 0.06rem;
    .invite-title { font-size: 0.3rem; color: #333; font-weight: 500; }
    .invite-sub { font-size: 0.24rem; color: #f60; }
  }
  .invite-arrow { font-size: 0.4rem; color: #ccc; }
}
</style>
