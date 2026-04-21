<template>
  <div id="comment">
    <v-head title="评论" goBack="true" bgColor="#f4f4f4"></v-head>
    <div class="deliver-comment">
      <div class="deliver-info">
        <div class="avatar">
          <img src="http://img.go007.com/2016/05/21/c48d2b4e639e5255_1.jpg">
        </div>
        <div class="info-container">
          <span class="deliver-type">美团快送</span>
          <div class="deliver-time">
            <span>今天19：10左右送达</span>
            <span class="time-error">时间不准 <i class="iconfont">&#xe6d7;</i></span>
          </div>
        </div>
      </div>
      <star @makeScore="setDeliveryScore"></star>
    </div>
    <div class="main-container">
      <div class="restaurant-info" v-if="restaurant_info">
        <span class="avatar">
          <img :src="restaurant_info.pic_url">
        </span>
        <span class="restaurant-name">{{ restaurant_info.name }}</span>
      </div>
      <star @makeScore="setFoodScore"></star>
      <div class="food-comment">
        <textarea
          class="comment-data"
          v-model="commentData"
          style="resize:none"
          placeholder="亲，菜品口味如何，对包装服务等还满意吗？"
          @input="input($event)"></textarea>
        <span class="tip">至少输入2个字</span>
      </div>
      <div class="upload-picture-container">
        <div class="uplist-container" v-for="(item, index) in uploadList" :key="index">
          <div class="pic"><img :src="item"></div>
          <div class="delete" @click="deletePic(index)">
            <i class="iconfont icon-delete">&#xe60d;</i>
          </div>
        </div>
        <label class="upload">
          <i class="iconfont upload-icon">&#xe782;</i>
          <input id="file" type="file" @change="fileUpload($event)" style="display: none;">
        </label>
        <div class="upload-description" v-show="!uploadList.length">
          <h3>上传图片</h3>
          <p>内容丰富的评论有机会成为优质评价哦</p>
        </div>
      </div>
    </div>
    <div class="hidden-name-comment">
      <span class="selector no-select" v-if="!hiddenName" @click="hiddenName = !hiddenName"></span>
      <span class="selector select" v-else>
        <i class="iconfont" @click="hiddenName = !hiddenName">&#xe6da;</i>
      </span>
      <h4>匿名评价</h4>
    </div>
    <div class="submit" :class="{ active: satisfySubmit }" @click="submitComment()">
      <span>提交</span>
    </div>
    <v-loading v-show="loading"></v-loading>
    <alert-tip :text="alertText" v-model:showTip="showTip" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import star from './star.vue'
import { makeComment, orderInfo } from '@/api/order'
import { uploadToken, upload } from '@/api/upload'
import config from '@/config'

const route = useRoute()
const router = useRouter()

const restaurant_info = ref({})
const deliveryScore = ref(1)
const foodScore = ref(1)
const hiddenName = ref(false)
const commentValueLength = ref(0)
const satisfySubmit = ref(false)
const commentData = ref('')
const uploadList = ref([])
const loading = ref(false)
const alertText = ref('')
const showTip = ref(false)
let order_id = null

function setDeliveryScore(score) { deliveryScore.value = score }
function setFoodScore(score) { foodScore.value = score }

function input($event) {
  commentValueLength.value = $event.target.value.length
  satisfySubmit.value = commentValueLength.value >= 2
}

function deletePic(index) { uploadList.value.splice(index, 1) }

function fileUpload(event) {
  if (uploadList.value.length >= 3) {
    alertText.value = '最多上传3张图片'
    showTip.value = true
    return
  }
  loading.value = true
  const file = event.target.files[0]
  uploadToken().then((response) => {
    if (response.data.status === 200) {
      const data = { token: response.data.uptoken, file }
      upload(data).then((upResponse) => {
        uploadList.value.push(config.domain + upResponse.data.key)
        loading.value = false
      })
    } else {
      alertText.value = response.data.message
      showTip.value = true
    }
  })
}

function submitComment() {
  if (!satisfySubmit.value) return
  makeComment({
    hidden_name: hiddenName.value,
    order_id,
    comment_data: commentData.value,
    food_score: foodScore.value,
    delivery_score: deliveryScore.value,
    pic_url: uploadList.value
  }).then((response) => {
    const res = response.data
    alertText.value = res.message
    showTip.value = true
    if (res.status === 200) {
      setTimeout(() => { router.push('/index') }, 1000)
    }
  })
}

onMounted(() => {
  order_id = route.query.order_id
  if (!order_id) {
    alertText.value = '参数有误'
    showTip.value = true
    setTimeout(() => { router.push('/index') }, 1000)
    return
  }
  orderInfo({ order_id }).then((response) => {
    const res = response.data
    if (res.status === 200) {
      restaurant_info.value = res.data.restaurant
    } else {
      alertText.value = res.message
      showTip.value = true
      setTimeout(() => { router.go(-1) }, 500)
    }
  })
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin.scss";

#comment {
  min-height: 100vh;
  position: absolute; top: 0; left: 0; right: 0;
  z-index: 1000; background: #f4f4f4;
  .avatar { display: inline-block; overflow: hidden; border-radius: 50%; border: 1px solid $mtGrey; @include px2rem(width, 80); @include px2rem(height, 80); margin-right: 0.5rem; img { width: 100%; height: 100%; } }
  .deliver-comment {
    background: #fff;
    .deliver-info {
      display: flex; padding: 0.5rem;
      .info-container { flex: 1; .deliver-type { font-size: 0.5rem; display: inline-block; margin-bottom: 0.2rem; } .deliver-time { font-size: 0.5rem; .time-error { float: right; font-size: 0.4rem; margin-top: 0.1rem; color: #508aca; .iconfont { border-radius: 50%; border: 1px solid #508aca; } } } }
    }
  }
  .main-container {
    background: #fff; margin-top: 0.5rem; padding: 0.2rem 0.5rem;
    .restaurant-info { display: flex; align-items: center; margin: 0.2rem 0; .restaurant-name { font-size: 0.5rem; } }
    .food-comment { position: relative; .comment-data { width: 100%; height: 100px; border: 1px solid $mtGrey; } .tip { color: $mtGrey; font-size: 0.4rem; position: absolute; right: 12px; bottom: 12px; } }
    .upload-picture-container {
      display: flex; margin: 0.3rem 0; align-items: center;
      .uplist-container { position: relative; margin-right: 0.2rem; border: 1px solid $mtGrey; .pic { @include px2rem(width, 140); @include px2rem(height, 140); img { width: 100%; height: 100%; } } .delete { position: absolute; right: -10px; top: -10px; @include px2rem(width, 45); @include px2rem(height, 45); text-align: center; border-radius: 50%; background: rgb(255, 76, 69); display: flex; justify-content: center; align-items: center; .icon-delete { font-size: 0.35rem; color: #fff; } } }
      .upload { display: inline-block; margin-right: 0.2rem; text-align: center; border: 1px solid $mtGrey; @include px2rem(width, 140); @include px2rem(height, 140); .upload-icon { @include px2rem(line-height, 140); font-size: 1rem; } }
      .upload-description { font-size: 0.4rem; p { margin-top: 0.2rem; color: $mtGrey; } }
    }
  }
  .hidden-name-comment {
    margin: 0.4rem 0.5rem;
    .selector { border-radius: 50%; display: inline-block; @include px2rem(width, 35); @include px2rem(height, 35); }
    .no-select { border: 1px solid $mtGrey; }
    .select { text-align: center; @include px2rem(line-height, 35); color: #fff; background: $mtYellow; .iconfont { font-size: 0.5rem; } }
    h4 { display: inline-block; font-size: 0.4rem; }
  }
  .submit {
    margin-top: 0.3rem; background: #cbcbcb; @include px2rem(line-height, 95); text-align: center;
    position: absolute; bottom: 0; left: 0; right: 0;
    &.active { background: $mtYellow; }
    span { color: #fff; font-size: 0.5rem; }
  }
}
</style>
