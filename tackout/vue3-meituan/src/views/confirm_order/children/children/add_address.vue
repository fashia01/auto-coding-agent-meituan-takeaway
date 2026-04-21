<template>
  <div id="address">
    <v-head title="新增收货地址" goBack="true">
      <template #save-address>
        <span class="btn-save" @click="save()">保存</span>
      </template>
    </v-head>
    <address-info v-model:formData="formData"></address-info>
    <router-view></router-view>
    <v-loading v-show="loading"></v-loading>
    <alert-tip :text="alertText" v-model:showTip="showTip" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAddressStore } from '@/stores'
import { add_address } from '@/api/user'

const router = useRouter()
const addressStore = useAddressStore()
const { deliveryAddress } = storeToRefs(addressStore)

const formData = ref({
  name: '测试',
  phone: 12345678910,
  gender: 'male',
  house_number: '16号楼427',
  title: ''
})
const satisfySubmit = ref(false)
const alertText = ref('')
const showTip = ref(false)
const loading = ref(false)
const preventRepeat = ref(false)

function save() {
  if (preventRepeat.value) return
  if (!deliveryAddress.value || !deliveryAddress.value.address) {
    alertText.value = '请先选择收货地址'
    showTip.value = true
    return
  }
  const dissatisfy = Object.values(formData.value).some(value => !value)
  satisfySubmit.value = !dissatisfy
  if (dissatisfy) {
    alertText.value = '信息填写不完整'
    showTip.value = true
  } else {
    preventRepeat.value = true
    const { location, address, province, city, title } = deliveryAddress.value
    const form = {
      ...formData.value,
      address: address || deliveryAddress.value.title,
      province: province || '',
      city: city || '',
      title: title || '',
      lng: location ? location.lng : '',
      lat: location ? location.lat : ''
    }
    console.log('提交地址表单数据:', form)
    add_address(form).then((response) => {
      console.log('添加地址响应:', response)
      if (response.data.status === 200) {
        router.go(-1)
      } else {
        alertText.value = response.data.message || '添加地址失败'
        showTip.value = true
      }
      preventRepeat.value = false
    }).catch((error) => {
      console.error('添加地址错误:', error)
      alertText.value = '添加地址失败，请稍后重试'
      showTip.value = true
      preventRepeat.value = false
    })
  }
}

watch(deliveryAddress, (val) => {
  if (val && val.title) {
    formData.value.title = val.title
  }
}, { immediate: true, deep: true })
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../../../style/mixin";

#address {
  position: fixed;
  left: 0; right: 0; top: 0; bottom: 0;
  background: #f4f4f4;
  .btn-save {
    position: absolute;
    right: 15px; top: 2px;
    font-size: 0.5rem;
    font-weight: 600;
  }
}
</style>
