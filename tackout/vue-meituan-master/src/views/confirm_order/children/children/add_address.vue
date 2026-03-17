<!--增加收货地址-->
<template>
  <div id="address">
    <v-head title="新增收货地址" goBack=true>
      <span slot="save-address" class="btn-save" @click="save();">保存</span>
    </v-head>
    <address-info :formData.sync="formData"></address-info>
    <router-view></router-view>

    <v-loading v-show="loading"></v-loading>
    <alert-tip :text="alertText" :showTip.sync="showTip"></alert-tip>
  </div>
</template>

<script>
  import {add_address} from '@/api/user'
  import {mapGetters} from 'vuex'
  import addressInfo from '@/components/addressInfo'

  export default {
    data() {
      return {
        formData: {
          name: '测试',
          phone: 12345678910,
          gender: "male",
          house_number: '16号楼427',
          title: ''
        },
        satisfySubmit: false,
        alertText: '',      //提示
        showTip: false,
        loading: false,
        preventRepeat: false   //阻止重复提交
      }
    },
    computed: {
      ...mapGetters(['deliveryAddress'])
    },
    methods: {
      save() {
        if (this.preventRepeat) {
          return
        }
        // 检查 deliveryAddress 是否存在
        if (!this.deliveryAddress || !this.deliveryAddress.address) {
          this.alertText = '请先选择收货地址'
          this.showTip = true;
          return
        }
        let dissatisfy = Object.values(this.formData).some((value) => {
          return !value
        })
        this.satisfySubmit = !dissatisfy;
        if (dissatisfy) {
          this.alertText = '信息填写不完整'
          this.showTip = true;
        } else {
          this.preventRepeat = true;
          let {location, address, province, city, title} = this.deliveryAddress;
          // 确保 location 对象存在并且包含 lng, lat
          let form = {
            ...this.formData,
            address: address || this.deliveryAddress.title,
            province: province || '',
            city: city || '',
            title: title || '',
            lng: location ? location.lng : '',
            lat: location ? location.lat : ''
          };
          console.log('提交地址表单数据:', form);
          add_address(form).then((response) => {
            console.log('添加地址响应:', response);
            if (response.data.status === 200) {
              this.$router.go(-1);
            } else {
              this.alertText = response.data.message || '添加地址失败'
              this.showTip = true;
            }
            this.preventRepeat = false;
          }).catch((error) => {
            console.error('添加地址错误:', error);
            this.alertText = '添加地址失败，请稍后重试'
            this.showTip = true;
            this.preventRepeat = false;
          })
        }
      }
    },
    components: {
      'address-info': addressInfo
    },
    watch: {
      deliveryAddress: {
        handler(val) {
          if (val && val.title) {
            this.$set(this.formData, 'title', val.title);
          }
        },
        immediate: true,
        deep: true
      }
    }
  }
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
  @import "../../../../style/mixin";

  #address {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background: #f4f4f4;
    .btn-save {
      position: absolute;
      right: 15px;
      top: 2px;
      font-size: 0.5rem;
      font-weight: 600;
    }
  }
</style>
