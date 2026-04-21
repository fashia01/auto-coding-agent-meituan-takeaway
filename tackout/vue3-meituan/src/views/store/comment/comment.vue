<template>
  <div id="comment">
    <div class="scroll-container" ref="commentRef">
      <article>
        <div class="comment-score-container">
          <div>
            <span class="comment-score">{{ poi_info.wm_poi_score }}</span>
            <h3>商家评分</h3>
          </div>
          <div>
            <div>
              <span>口味</span>
              <v-star :score="poi_info.food_score"></v-star>
              <span class="food-score">{{ poi_info.food_score }}</span>
            </div>
            <div>
              <span>包装</span>
              <v-star :score="poi_info.pack_score"></v-star>
              <span class="pack-score">{{ poi_info.pack_score }}</span>
            </div>
          </div>
          <div>
            <span class="delivery-score">{{ poi_info.delivery_score }}</span>
            <h3>配送评分</h3>
          </div>
        </div>
        <ul class="comment-score-type-info">
          <li class="active">全部</li>
          <li>有图</li>
          <li><i class="iconfont">&#xe741;</i> 点评(0.0分)</li>
        </ul>
        <ul class="comment-score-type-tip">
          <li v-for="tip in commentData.comment_score_type_infos" :key="tip.comment_score_title">
            {{ tip.comment_score_title }} {{ tip.total_count }}
          </li>
          <li v-for="tip in commentData.labels" :key="tip.label_id">{{ tip.content }} {{ tip.label_count }}</li>
        </ul>
        <van-list
          v-model:loading="loading"
          :finished="noMore"
          finished-text="已经到底了"
          @load="loadMore">
          <article class="comments-container">
            <section v-for="item in commentData" :key="item.id">
              <div class="user-pic-url">
                <img :src="item.avatar">
              </div>
              <div class="comment-main-part">
                <div>
                  <span class="user-name">{{ item.user_name }}</span>
                  <span class="comment-time">{{ item.comment_time ? item.comment_time.slice(0, 10) : '' }}</span>
                </div>
                <div class="order-comment-score">
                  <span>评分 <v-star :score="item.food_score"></v-star></span>
                </div>
                <p class="comment">{{ item.comment_data }}</p>
                <div class="comment-pic">
                  <div v-for="(pic, index) in item.pic_url" @click="showBigPicEvent(pic)" :key="index">
                    <van-image :src="pic" fit="cover" width="100%" height="100%" />
                  </div>
                </div>
              </div>
            </section>
          </article>
        </van-list>
      </article>
    </div>
    <!-- 大图 -->
    <transition>
      <div class="show-big-pic" v-show="showBigPic" @click="showBigPic = false">
        <div>
          <img :src="bigPicUrl">
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { restaurantComment, getRestaurant } from '@/api/restaurant'

const route = useRoute()

const commentData = ref([])
const bigPicUrl = ref('')
const showBigPic = ref(false)
const poi_info = ref({})
const noMore = ref(false)
const loading = ref(false)
const offset = ref(0)
let restaurant_id = null

function fetchComment(callback) {
  restaurantComment({ restaurant_id, offset: offset.value, limit: 5 }).then((response) => {
    callback(response)
  })
}

function showBigPicEvent(url) {
  bigPicUrl.value = url
  showBigPic.value = true
}

function loadMore() {
  fetchComment((response) => {
    if (!response.data.data.length) {
      noMore.value = true
    } else {
      offset.value++
      commentData.value = commentData.value.concat(response.data.data)
    }
    loading.value = false
  })
}

onMounted(() => {
  restaurant_id = route.query.id
  fetchComment((response) => {
    commentData.value = response.data.data
  })
  getRestaurant({ restaurant_id }).then((response) => {
    poi_info.value = response.data.data
  })
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../../style/mixin.scss";

#comment {
  display: flex;
  flex: 1;
  background: grey;
  overflow: hidden;
  .scroll-container { width: 100%; overflow-y: auto; }
  .comment-score-container {
    display: flex;
    align-items: center;
    padding: 0.35rem 0.3rem;
    background: #fff;
    margin: 0.2rem 0;
    & > div:first-child, & > div:last-child {
      text-align: center;
      span { font-size: 1.2rem; }
      .comment-score { color: #ffb000; }
      .delivery-score { color: #999; }
      h3 { font-size: 0.3rem; margin-top: 0.2rem; }
    }
    & > div:nth-child(2) {
      flex: 1;
      text-align: center;
      & > div:first-child { @include px2rem(margin-bottom, 30); }
      div {
        span:first-child { font-size: 0.4rem; }
        span:last-child { font-size: 0.5rem; color: #ffb000; }
      }
    }
  }
  .comment-score-type-info {
    background: #fff;
    display: flex;
    padding: 0.4rem;
    li {
      flex: 1; color: #ffb000; display: inline-block; font-size: 0.3rem;
      border-radius: 2px; text-align: center; border: 1px solid #ffb000; @include px2rem(line-height, 70);
      &.active { background: $mtYellow; color: #000; font-weight: bold; }
    }
  }
  .comment-score-type-tip {
    background: #fff;
    padding: 0 0.4rem;
    li { display: inline-block; padding: 0 0.1rem; background: #f4f4f4; font-size: 0.3rem; @include px2rem(line-height, 55); margin: 0 0.1rem 0.1rem 0; }
  }
  .comments-container {
    background: #fff;
    section {
      display: flex;
      padding: 0.53rem 0.1rem 0.1rem;
      .user-pic-url { @include px2rem(width, 80); @include px2rem(height, 70); border-radius: 50%; overflow: hidden; img { width: 100%; height: 100%; } }
      .comment-main-part {
        flex: 1; padding-left: 0.1rem;
        & > div:first-child { display: flex; justify-content: space-between; .user-name { font-size: 0.3rem; font-weight: 600; } .comment-time { font-size: 0.3rem; } }
        .order-comment-score { margin: 0.1rem 0; span { font-size: 0.3rem; color: #999; } }
        .comment { font-size: 0.35rem; @include px2rem(line-height, 40); color: #222; font-weight: 500; }
        .comment-pic { div { display: inline-block; @include px2rem(width, 120); @include px2rem(height, 120); margin: 0.1rem 0.2rem 0.1rem 0; } }
      }
    }
  }
  .show-big-pic {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: #000; z-index: 999;
    div { width: 100%; height: auto; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); img { width: 100%; height: 100%; } }
  }
}
</style>
