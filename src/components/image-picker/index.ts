import { h, defineComponent, computed } from "vue"
import Taro from '@tarojs/taro'

import classNames from 'classnames'
import { uuid } from '@/utils/common'

import { Image, View } from '@tarojs/components'
import { AtImagePickerProps, File } from 'types/image-picker'

import AtComponentWithDefaultProps from '../mixins'

interface MatrixFile extends Partial<File> {
    type: 'blank' | 'btn'
    uuid: string
}

// 生成 jsx 二维矩阵
const generateMatrix = (
    files: MatrixFile[],
    col: number,
    showAddBtn: boolean
): MatrixFile[][] => {
    const matrix: Array<MatrixFile>[] = []
    const length = showAddBtn ? files.length + 1 : files.length
    const row = Math.ceil(length / col)
    for (let i = 0; i < row; i++) {
        if (i === row - 1) {
            // 最后一行数据加上添加按钮
            const lastArr = files.slice(i * col)
            if (lastArr.length < col) {
                if (showAddBtn) {
                    lastArr.push({ type: 'btn', uuid: uuid() })
                }
                // 填补剩下的空列
                for (let j = lastArr.length; j < col; j++) {
                    lastArr.push({ type: 'blank', uuid: uuid() })
                }
            }
            matrix.push(lastArr)
        } else {
            matrix.push(files.slice(i * col, (i + 1) * col))
        }
    }
    return matrix
}

const ENV = Taro.getEnv()

const AtImagePicker = defineComponent({
    mixins: [AtComponentWithDefaultProps],

    props: {
        // 参数
        files: {
            type: Array as () => AtImagePickerProps['files'],
            default: () => [],
        },
        mode: {
            type: String as () => AtImagePickerProps['mode'],
            default: 'aspectFill' as AtImagePickerProps['mode']
        },
        showAddBtn: { 
            type: Boolean,
            default: true
        },
        multiple: Boolean,
        length: {
            type: Number as () => AtImagePickerProps['length'],
            default: 4
        },
        count: Number as () => AtImagePickerProps['count'],
        sizeType: Array as () => AtImagePickerProps['sizeType'],
        sourceType: Array as () => AtImagePickerProps['sourceType'],    
        // 事件
        onChange: {
            type: Function as unknown as () => AtImagePickerProps['onChange'],
            default: () => () => {},
            required: true
        },
        onImageClick: {
            type: Function as unknown as () => AtImagePickerProps['onImageClick'],
            default: () => () => {}
        },
        onFail: {
            type: Function as unknown as () => AtImagePickerProps['onFail'],
            default: () => () => {}
        },
    },

    setup(props: AtImagePickerProps) {
        
        function chooseFile() {
            const params: any = {}

            const filePathName = 
                ENV === Taro.ENV_TYPE.ALIPAY
                    ? 'apFilePaths'
                    : 'tempFiles'
            
            if (props.multiple) {
                params.count = 99
            }

            if (props.count) {
                params.count = props.count
            }

            if (props.sizeType) {
                params.sizeType = props.sizeType
            }

            if (props.sourceType) {
                params.sourceType = props.sourceType
            }

            Taro.chooseImage(params)
                .then(res => {
                    const targetFiles = res.tempFilePaths.map((path, i) => ({
                        url: path,
                        file: res[filePathName][i]
                    }))

                    const newFiles = props.files.concat(targetFiles)

                    props.onChange(newFiles, 'add')
                })
                .catch(props.onFail)
        }

        function handleImageClick(idx: number) {
            props.onImageClick && props.onImageClick(idx, props.files[idx])
        }

        function handleRemoveImg(idx: number) {
            if(ENV === Taro.ENV_TYPE.WEB) {
                window.URL.revokeObjectURL(props.files[idx].url)
            }
            
            const newFiles = props.files.filter((_, i) => i !== idx)

            props.onChange(newFiles, 'remove', idx)
        }

        return () => {
            const rowLength = props.length! <= 0 ? 1 : props.length

            const matrix = computed(() => generateMatrix(
                props.files as MatrixFile[],
                rowLength!,
                props.showAddBtn!
            ))

            const rootClass = computed(() => classNames(
                'at-image-picker',
                props.className
            ))

            const genPreviewNode = (item, i, j) => h(View, { class: 'at-image-picker__item' }, [
                h(View, {
                    class: 'at-image-picker__remove-btn',
                    onTap: handleRemoveImg.bind(this, i * props.length! + j)
                }),
                h(Image, {
                    class: 'at-image-picker__preview-img',
                    mode: props.mode,
                    src: item.url,
                    onTap: handleImageClick.bind(this, i * props.length! + j)
                })
            ])

            const addBarNode = h(View,
                {
                    class: 'at-image-picker__item at-image-picker__choose-btn',
                    onTap: chooseFile
                }, 
                Array.apply(null, { length: 2 })
                    .map(() => h(View, { class: 'add-bar' }))
            )

            const genItemNodes = (row, i) => row.map((item, j) => {
                return (
                    h(View, {
                        class: 'at-image-picker__flex-item',
                        key: i*props.length! +j
                    }, [
                        item.url
                            ? genPreviewNode(item, i, j)
                            : item.type === 'btn' && addBarNode
                    ])
                )
            })

            const matrixNodes = matrix.value.map((row, i) => {
                return h(View, {
                    class: 'at-image-picker__flex-box',
                    key: i + 1
                }, genItemNodes(row, i))
            })

            return (
                h(View, {
                    class: rootClass.value,
                    style: props.customStyle
                }, matrixNodes)  
            )
        }
    }
})

export default AtImagePicker