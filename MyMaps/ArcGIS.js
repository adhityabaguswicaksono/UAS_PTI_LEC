require([
    "esri/config",
    "esri/Map",
    "esri/views/MapView",

    "esri/widgets/Search",
    "esri/widgets/Locate",
    "esri/widgets/Track",
    "esri/Graphic",

    "esri/widgets/BasemapToggle",
    "esri/widgets/BasemapGallery",

    "esri/rest/route",
    "esri/rest/support/RouteParameters",
    "esri/rest/support/FeatureSet",

    "esri/widgets/ScaleBar",
    "esri/widgets/Sketch",
    "esri/layers/GraphicsLayer",
    "esri/geometry/geometryEngine"

  ], function(esriConfig, Map, MapView, Search, Locate, Track, Graphic, BasemapToggle, BasemapGallery, route, RouteParameters, FeatureSet, ScaleBar, Sketch, GraphicsLayer, geometryEngine) {

  esriConfig.apiKey = "AAPKeaa8a0a53d6245f09816f87f8d7400caWne7Wo5c2O89xVAiu6w1dEdiWYp-rwGQv7n-h9ErjafyCKIihetfqxmStRO5vz7U";

  const map = new Map({
      basemap: "arcgis-navigation"
    });

  const view = new MapView({
      container: "viewDiv",
      map: map,
      center: [106.8319547310772, -6.247573838636269],
      zoom: 10
    });
    
  /* Search Bar */
  const search = new Search({  //Add Search widget
      view: view
    });

    view.ui.add(search, "top-right"); //Add to the map

  /* Location Marker */
    const locate = new Locate({
      view: view,
      useHeadingEnabled: false,
      goToOverride: function(view, options) {
        options.target.scale = 1500;
        return view.goTo(options.target);
      }
    });
    view.ui.add(locate, "top-left");
    
    /* Track Marker */
    const track = new Track({
      view: view,
      graphic: new Graphic({
        symbol: {
          type: "simple-marker",
          size: "12px",
          color: "green",
          outline: {
            color: "#efefef",
            width: "1.5px"
          }
        }
      }),
      useHeadingEnabled: false
    });
    view.ui.add(track, "top-left");

      /*BaseMap Toogle*/
    const basemapToggle = new BasemapToggle({
      view: view,
      nextBasemap: "arcgis-imagery"
  });
    view.ui.add(basemapToggle,"bottom-right");

    const routeUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

    view.on("click", function(event){
      if (view.graphics.length === 0) {
        addGraphic("origin", event.mapPoint);
      } else if (view.graphics.length === 1) {
        addGraphic("destination", event.mapPoint);
        getRoute(); // Call the route service
      } else {
        view.graphics.removeAll();
        addGraphic("origin",event.mapPoint);
      }
    });

    function addGraphic(type, point) {
      const graphic = new Graphic({
        symbol: {
          type: "simple-marker",
          color: (type === "origin") ? "white" : "black",
          size: "8px"
        },
        geometry: point
      });
      view.graphics.add(graphic);
    }

    function getRoute() {
  const routeParams = new RouteParameters({
    stops: new FeatureSet({
      features: view.graphics.toArray()
    }),
    returnDirections: true
  });

  route.solve(routeUrl, routeParams)
    .then(function(data) {
      data.routeResults.forEach(function(result) {
        result.route.symbol = {
          type: "simple-line",
          color: [5, 150, 255],
          width: 3
        };
        view.graphics.add(result.route);
      });
      // Display directions
      if (data.routeResults.length > 0) {
        const directions = document.createElement("ol");
        directions.classList = "esri-widget esri-widget--panel esri-directions__scroller";
        directions.style.marginTop = "0";
        directions.style.padding = "15px 15px 15px 30px";
        const features = data.routeResults[0].directions.features;
        // Show each direction
        features.forEach(function(result,i){
          const direction = document.createElement("li");
          direction.innerHTML = result.attributes.text + " (" + result.attributes.length.toFixed(2) + " miles)";
          directions.appendChild(direction);
        });
        view.ui.empty("top-right");
        view.ui.add(directions, "top-right");
      }
    })
    .catch(function(error){
        console.log(error);
    })
}
  /* Find Length and Area */
  const scalebar = new ScaleBar({
      view: view,
      unit: "metric"
    });
    view.ui.add(scalebar, "bottom-right");
    const graphicsLayer = new GraphicsLayer();
    map.add(graphicsLayer);
    const sketch = new Sketch({
      layer: graphicsLayer,
      view: view,
      availableCreateTools: ["polyline", "polygon", "rectangle"],
      creationMode: "update",
      updateOnGraphicClick: true,
      visibleElements: {
        createTools: {
          point: false,
          circle: false
        },
        selectionTools:{
          "lasso-selection": false,
          "rectangle-selection":false,
        },
        settingsMenu: false,
        undoRedoMenu: false
      }
    });
    view.ui.add(sketch, "top-right");

    const measurements = document.getElementById("measurements");
    view.ui.add(measurements, "manual");

    function getArea(polygon) {
      const geodesicArea = geometryEngine.geodesicArea(polygon, "square-kilometers");
      const planarArea = geometryEngine.planarArea(polygon, "square-kilometers");
      measurements.innerHTML =
      "<b>Geodesic area</b>:  " + geodesicArea.toFixed(2) + " km\xB2" + " |   <b>Planar area</b>: " + planarArea.toFixed(2) + "  km\xB2";
    }

    function getLength(line) {
      const geodesicLength = geometryEngine.geodesicLength(line, "kilometers");
      const planarLength = geometryEngine.planarLength(line, "kilometers");
      measurements.innerHTML =
        "<b>Geodesic length</b>:  " + geodesicLength.toFixed(2) + " km" + " |   <b>Planar length</b>: " + planarLength.toFixed(2) + "  km";
    }

    function switchType(geom) {
      switch (geom.type) {
        case "polygon":
          getArea(geom);
          break;
        case "polyline":
          getLength(geom);
          break;
        default:
          console.log("No value found");
      }
    }

    sketch.on("update", (e) => {
      const geometry = e.graphics[0].geometry;
      if (e.state === "start") {
        switchType(geometry);
      }

      if (e.state === "complete") {
        graphicsLayer.remove(graphicsLayer.graphics.getItemAt(0));
        measurements.innerHTML = null;
      }

      if (
        e.toolEventInfo &&
        (e.toolEventInfo.type === "scale-stop" ||
          e.toolEventInfo.type === "reshape-stop" ||
          e.toolEventInfo.type === "move-stop")
      ) {
        switchType(geometry);
      }
    });
  });