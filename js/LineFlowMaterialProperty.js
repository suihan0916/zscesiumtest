import * as Cesium from 'cesium'

class LineFlowMaterialProperty {
  constructor(options) {
    this._definitionChanged = new Cesium.Event()
    this._color = undefined
    this._speed = undefined
    this._percent = undefined
    this._gradient = undefined
    this.color = options.color
    this.speed = options.speed
    this.percent = options.percent
    this.gradient = options.gradient
  }

  get isConstant() {
    return false
  }

  get definitionChanged() {
    return this._definitionChanged
  }

  getType(time) {
    return Cesium.Material.LineFlowMaterialType
  }

  getValue(time, result) {
    if (!Cesium.defined(result)) {
      result = {}
    }

    result.color = Cesium.Property.getValueOrDefault(this._color, time, Cesium.Color.RED, result.color)
    result.speed = Cesium.Property.getValueOrDefault(this._speed, time, 5.0, result.speed)
    result.percent = Cesium.Property.getValueOrDefault(this._percent, time, 0.1, result.percent)
    result.gradient = Cesium.Property.getValueOrDefault(this._gradient, time, 0.01, result.gradient)
    return result
  }

  equals(other) {
    return (
      this === other ||
      (other instanceof LineFlowMaterialProperty &&
        Cesium.Property.equals(this._color, other._color) &&
        Cesium.Property.equals(this._speed, other._speed) &&
        Cesium.Property.equals(this._percent, other._percent) &&
        Cesium.Property.equals(this._gradient, other._gradient))
    )
  }
}

Object.defineProperties(LineFlowMaterialProperty.prototype, {
  color: Cesium.createPropertyDescriptor('color'),
  speed: Cesium.createPropertyDescriptor('speed'),
  percent: Cesium.createPropertyDescriptor('percent'),
  gradient: Cesium.createPropertyDescriptor('gradient')
})

Cesium.LineFlowMaterialProperty = LineFlowMaterialProperty
Cesium.Material.LineFlowMaterialProperty = 'LineFlowMaterialProperty'
Cesium.Material.LineFlowMaterialType = 'LineFlowMaterialType'
Cesium.Material.LineFlowMaterialSource = `
    uniform vec4 color;
    uniform float speed;
    uniform float percent;
    uniform float gradient;
    czm_material czm_getMaterial(czm_materialInput materialInput){
      czm_material material = czm_getDefaultMaterial(materialInput);
      vec2 st = materialInput.st;
      float t =fract(czm_frameNumber * speed / 1000.0);
      t *= (1.0 + percent);
      float alpha = smoothstep(t- percent, t, st.s) * step(-t, -st.s);
      alpha += gradient;
      material.diffuse = color.rgb;
      material.alpha = alpha;
      return material;
    }
    `

Cesium.Material._materialCache.addMaterial(Cesium.Material.LineFlowMaterialType, {
  fabric: {
    type: Cesium.Material.LineFlowMaterialType,
    uniforms: {
      color: new Cesium.Color(1.0, 0.0, 0.0, 1.0),
      speed: 10.0,
      percent: 0.1,
      gradient: 1000
    },
    source: Cesium.Material.LineFlowMaterialSource
  },
  translucent: function (material) {
    return true
  }
})

/**
 * @description: 抛物飞线效果初始化
 * @param {*} _viewer
 * @param {*} _num :每条线上的飞线数量
 * @return {*}
 */
function parabolaFlowInit(_viewer, _num, p1, p2, _material, _depthFailMaterial) {
  let _center = [p1.longitude, p1.latitude]
  let _positions = [[p2.longitude, p2.latitude]]
  _positions.forEach((item) => {
    let _siglePositions
    if (p1.height > p2.height) {
      _siglePositions = parabola(_center, item, 100000)
    } else {
      _siglePositions = parabola(_center, item, 200000)
    }

    const color = { r: 100, g: 255, b: 80 }
    // 创建飞线
    for (let i = 0; i < _num; i++) {
      let modelEntity = _viewer.entities.add({
        polyline: {
          positions: _siglePositions,
          material: _material,
          depthFailMaterial: _depthFailMaterial,
          width: 2
        }
      })

      // setTimeout(function () {
      //   _viewer.entities.remove(modelEntity)
      // }, 1300)
    }
    // 创建轨迹线
    // _viewer.entities.add({
    //     polyline: {
    //         positions: _siglePositions,
    //         material: new Cesium.Color(1.0, 1.0, 0.0, 0.0),
    //     }
    // })
  })

  /**
   * @description: 抛物线构造函数（参考开源代码）
   * @param {*}
   * @return {*}
   */
  function parabola(startPosition, endPosition, height = 1000, count = 100) {
    // 方程 y=-(4h/L^2)*x^2+h h:顶点高度 L：横纵间距较大者
    let result = []
    height = Math.max(+height, 1000)
    count = Math.max(+count, 50)
    let diffLon = Math.abs(startPosition[0] - endPosition[0])
    let diffLat = Math.abs(startPosition[1] - endPosition[1])
    let L = Math.max(diffLon, diffLat)
    let dlt = L / count
    if (diffLon > diffLat) {
      //base on lon
      let delLat = (endPosition[1] - startPosition[1]) / count
      if (startPosition[0] - endPosition[0] > 0) {
        dlt = -dlt
      }
      for (let i = 0; i < count; i++) {
        let h = height - (Math.pow(-0.5 * L + Math.abs(dlt) * i, 2) * 4 * height) / Math.pow(L, 2)
        let lon = startPosition[0] + dlt * i
        let lat = startPosition[1] + delLat * i
        let point = new Cesium.Cartesian3.fromDegrees(lon, lat, h)
        result.push(point)
      }
    } else {
      //base on lat
      let delLon = (endPosition[0] - startPosition[0]) / count
      if (startPosition[1] - endPosition[1] > 0) {
        dlt = -dlt
      }
      for (let i = 0; i < count; i++) {
        let h = height - (Math.pow(-0.5 * L + Math.abs(dlt) * i, 2) * 4 * height) / Math.pow(L, 2)
        let lon = startPosition[0] + delLon * i
        let lat = startPosition[1] + dlt * i
        let point = new Cesium.Cartesian3.fromDegrees(lon, lat, h)
        result.push(point)
      }
    }
    return result
  }
}

export { parabolaFlowInit }
