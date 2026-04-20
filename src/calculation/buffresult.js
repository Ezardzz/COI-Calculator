const result={
    "影响":{
        "维护":{
            "消耗":1,
            "产出":1,
        },
        "回收":0.2,
        "居民服务":{
            "食品消耗":1,
            "商品":{
                "家庭用品":{
                    "消耗":1 ,
                    "凝聚力":1 ,
                },
                "家用设备":{
                    "消耗":1,
                    "凝聚力":1,
                },
                "消费类电子产品":{
                    "消耗":1,
                    "凝聚力":1,
                },
                "消耗":1
            },
            "水消耗":1,
            "凝聚力":1,
            "住房容量":1
        },
        "农业":{
            "产量":1,
            "耗水量":1
        },
        "载具":{
            "燃料":{
                "车辆":1,
                "火车":1,
                "船舶":1,
            },
            "载荷":{
                "火箭":1,
            }
        },
        "专注点":1,
        "研究效率":1,
        "太阳能":0.8,
    },
    "额外消耗":{
        "凝聚力":0,
        "专注点":0,
    }
}

function calBuffResult(configuration){
    const buff = configuration.buff
    const N = configuration.facility.demand.factory?.维护雕像 ?? 0
    const result={
        "影响":{
            "维护":{
                "消耗":(1 - (buff?.edicts?.减少维护?.effect ?? 0))
                      *(1 - 0.04 * (1 - 0.5 ** N) / (1 - 0.5)),
                "产出":(1 + (buff?.office?.维修产量?.effect ?? 0))
                     * (1 + (buff?.research?.维修产量?.effect[0] ?? 0)),
            },
            "回收":0.2 + (buff?.edicts?.增加回收?.effect ?? 0)
                      + (buff?.office?.回收效率?.effect ?? 0),
            "居民服务":{
                "食品消耗":(1 - (buff?.edicts?.节省食物?.effect ?? 0) 
                            + (buff?.edicts?.食物充沛?.effect ?? 0))
                            * (1 + (buff?.office?.食物消耗?.effect ?? 0)),
                "商品":{
                    "家庭用品":{
                        "消耗":1 + (buff?.edicts?.更多家具用品?.effect ?? 0),
                        "凝聚力":1 +(buff?.edicts?.更多家具用品?.unity ?? 0),
                    },
                    "家用设备":{
                        "消耗":1 + (buff?.edicts?.更多家电?.effect ?? 0),
                        "凝聚力":1 + (buff?.edicts?.更多家电?.unity ?? 0),
                    },
                    "消费类电子产品":{
                        "消耗":1 + (buff?.edicts?.更多消费电子产品?.effect ?? 0),
                        "凝聚力":1 + (buff?.edicts?.更多消费电子产品?.unity ?? 0),
                    },
                    "消耗":1 + (buff?.office?.商品与服务消耗?.effect ?? 0)//除了水和食物以外的服务
                },
                "水消耗":(1 - (buff?.edicts?.节水器?.effect ?? 0))
                      * (1 + (buff?.research?.定居点用水?.effect[0] ?? 0)),
                "凝聚力":1 + (buff?.office?.来自定居点的凝聚力?.effect ?? 0),
                "住房容量":1 + (buff?.research?.住房容量?.effect[0] ?? 0)
            },
            "农业":{
                "产量":(1 + (buff?.edicts?.农业提振?.effect ?? 0)) 
                    * (1 + (buff?.office?.农作物产量?.effect ?? 0))
                    * (1 + (buff?.research?.作物产量?.effect[0] ?? 0)),
                "耗水量":(1 - (buff?.edicts?.节水器?.effect ?? 0))
                      * (1 + (buff?.research?.作物产量?.effect[1] ?? 0))
            },
            "载具":{
                "燃料":{
                    "车辆":(1 - (buff?.edicts?.节省车辆燃料?.effect ?? 0))
                       * (1 + (buff?.research?.车辆燃料消耗?.effect[0] ?? 0)),
                    "火车":1 + (buff?.research?.火车燃料消耗?.effect[0] ?? 0),
                    "船舶":(1 - (buff?.edicts?.节省船舶燃料?.effect ?? 0))
                       * (1 + (buff?.research?.船舰燃料消耗?.effect[0] ?? 0)),
                },
                "载荷":{
                    "火箭":1 + (buff?.research?.火箭载荷量?.effect[0] ?? 0),
                }
            },
            "专注点":1 + (buff?.research?.专注点?.effect[0] ?? 0),
            "研究效率":(1 + (buff?.edicts?.研究效率?.effect ?? 0))
                       *(1  + (buff?.office?.研究效率?.effect ?? 0)),
            "太阳能":0.8 * (1 + (buff?.edicts?.清洁面板?.effect ?? 0))
                    * (1 + (buff?.research?.太阳能发电?.effect[0] ?? 0)),
            "合同凝聚力":1 + (buff?.office?.合同凝聚力消耗?.effect ?? 0)
        },
        "额外消耗":{
            "凝聚力":0
                - (buff?.edicts?.节省食物?.unity ?? 0)
                - (buff?.edicts?.食物充沛?.unity ?? 0)
                - (buff?.edicts?.节省车辆燃料?.unity ?? 0)
                - (buff?.edicts?.节省船舶燃料?.unity ?? 0)
                - (buff?.edicts?.减少维护?.unity ?? 0)
                - (buff?.edicts?.增加回收?.unity ?? 0)
                - (buff?.edicts?.农业提振?.unity ?? 0)
                - (buff?.edicts?.节水器?.unity ?? 0)
                - (buff?.edicts?.清洁面板?.unity ?? 0)
                - (buff?.edicts?.研究效率?.unity ?? 0),
            "专注点":0
                + (buff?.office?.研究效率?.focus ?? 0)
                + (buff?.office?.维修产量?.focus ?? 0)
                + (buff?.office?.农作物产量?.focus ?? 0)
                + (buff?.office?.食物消耗?.focus ?? 0)
                + (buff?.office?.商品与服务消耗?.focus ?? 0)
                + (buff?.office?.来自定居点的凝聚力?.focus ?? 0)
                + (buff?.office?.合同利润率?.focus ?? 0)
                + (buff?.office?.合同凝聚力消耗?.focus ?? 0),
        }
    }
    return result
}