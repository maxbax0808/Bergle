import React, { useRef, useEffect, useState } from "react";
import Modal from "react-modal";
import * as d3 from "d3";
import { countries } from "../../domain/countries";
import { Guess } from "../../domain/guess";
import { useSharedGameState } from "../../shared/useGame";
import { useTranslation } from "react-i18next";
import { loadSettings } from "../../hooks/useSettings";

interface MapNode {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  neighbours: string[];
  fill?: string;
}

interface HelpProps {
  isOpen: boolean;
  close: () => void;
}

const Help: React.FC<HelpProps> = ({ isOpen, close }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  const {
    state: { country, guesses },
  } = useSharedGameState();
  const { t } = useTranslation();
  const settings = loadSettings();

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = svgDimensions;

    const mapNodes: MapNode[] = countries.map((country) => ({
      id: country.code,
      label: country.name,
      latitude: country.latitude || 0,
      longitude: country.longitude || 0,
      neighbours: country.neighbours,
    }));

    const mapEdges = generateMapEdges(mapNodes);

    const projection = d3
      .geoMercator()
      .fitExtent([[20, 20], [width - 20, height - 20]], {
        type: "FeatureCollection",
        features: mapNodes.map(nodeToFeature),
      } as GeoJSON.FeatureCollection<GeoJSON.GeometryObject>);

    const path = d3.geoPath().projection(projection);

    svg.selectAll("*").remove();

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([1, 10]).on("zoom", zoomed);

    const startscale = 1;
    const radiusStart = 5;

    svg.call(zoom);
    svg.call(
      zoom.transform,
      d3.zoomIdentity
        .translate(isMobileDevice() ? 0 : 100, 0)
        .scale(startscale)
    );

    function zoomed(event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
      g.attr("transform", event.transform.toString());

      if (event.transform.k <= 6) {
        g.selectAll("text").attr("dy", "1em")
        g.selectAll("text").attr("font-size", `${(-4.03955 * Math.log(0.109089 * event.transform.k))}px`);
        //g.selectAll("text").attr("stroke-width", 0.05)
      } else {
        if (isMobileDevice()) {
          g.selectAll("text").attr("dy", "1em")
        } else {
          g.selectAll("text").attr("dy", "2em")
        }

        g.selectAll("text").attr("font-size", `${(2.34836 - 0.106045 * event.transform.k)}px`);
        //g.selectAll("text").attr("stroke-width", 0.05)
      }

      g.selectAll("circle").attr("r", 4.5 - 1.4428 * (Math.log(event.transform.k)));
      g.selectAll("path").attr("stroke-width", 1 / event.transform.k);
    }

    g.selectAll("path")
      .data(mapEdges)
      .enter()
      .append("path")
      .attr("d", (d) => {
        const source = mapNodes.find((node) => node.id === d.source);
        const target = mapNodes.find((node) => node.id === d.target);
        if (source && target) {
          return path({
            type: "LineString",
            coordinates: [
              [source.longitude, source.latitude],
              [target.longitude, target.latitude],
            ],
          });
        }
        return null;
      })
      .attr("stroke", graphTheme.edge.stroke)
      .attr("stroke-width", 1)
      .attr("fill", "none");

    const nodeGroup = g.selectAll(".node-group")
      .data(mapNodes)
      .enter()
      .append("g")
      .attr("class", "node-group");

    nodeGroup.append("circle")
      .attr("cx", (d) => projection([d.longitude, d.latitude])?.[0] || 0)
      .attr("cy", (d) => projection([d.longitude, d.latitude])?.[1] || 0)
      .attr("r", radiusStart)
      .attr("id", (d) => d.id) // Assigning ID to circles
      .style("fill", (d) =>
        d.label.toLowerCase() === country.name.toLowerCase() ? graphTheme.node.activeFill : graphTheme.node.fill
      );

    nodeGroup.append("text")
      .attr("x", (d) => projection([d.longitude, d.latitude])?.[0] || 0)
      .attr("y", (d) => projection([d.longitude, d.latitude])?.[1] || 0)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("dy", "1em") // Adjusting position to be closer to the node
      .attr("font-size", "10px")
      //.attr("stroke", "#000000")
      //.attr("stroke-width", 0.05)
      .attr("fill", graphTheme.node.label.color)
      .text((d) => d.label);
console.log({settings, n: settings.hideNamesOnMap});
    adjustNodes(country.name.toLowerCase(), guesses, mapNodes, g, settings.hideNamesOnMap);
  }, [isOpen, country, guesses, svgDimensions, settings]);

  useEffect(() => {
    function handleResize() {
      const width = svgRef.current?.clientWidth || 0;
      const height = window.innerHeight * 0.8;
      setSvgDimensions({ width, height: height });
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function nodeToFeature(node: MapNode) {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [node.longitude, node.latitude],
      },
      properties: node,
    };
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={close}
      className="modal"
      style={{
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        content: {
          width: isMobileDevice() ? "100%" : "90%",
          height: isMobileDevice() ? "100%" : "90%",
          paddingBottom: "10px",
          backgroundColor: graphTheme.canvas.background,
        },
      }}
      onAfterOpen={() => {
        const width = svgRef.current?.clientWidth || 0;
        const height = svgRef.current?.clientHeight || 0;
        setSvgDimensions({ width, height: height });
      }}
    >
      <div className="flex flew-row justify-between margin-auto mb-0 pb-2">
        <h1 className="margin-auto font-bold text-slate-100 p-4">
          {t("mapTitle")}
        </h1>
        <button className="margin-auto p-4" onClick={close}>
          ❌
        </button>
      </div>
      <svg ref={svgRef} style={{ width: "100%", height: `${svgDimensions.height}px` }}></svg>
    </Modal>
  );
};

function isMobileDevice() {
  return (
    typeof window.matchMedia !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

function generateMapEdges(mapNodes: MapNode[]): { source: string; target: string }[] {
  const mapEdges: { source: string; target: string }[] = [];
  for (const node of mapNodes) {
    for (const neighbour of node.neighbours) {
      if (!mapEdges.find((edge) => edge.source === neighbour && edge.target === node.id)) {
        mapEdges.push({
          source: node.id,
          target: neighbour,
        });
      }
    }
  }
  return mapEdges;
}

const graphTheme = {
  canvas: { background: "#0f172a" }, // Navy Blue
  node: {
    fill: "#f2a900", // Yellow
    activeFill: "#f2a900",
    opacity: 1,
    selectedOpacity: 1,
    inactiveOpacity: 0.2,
    label: {
      color: "#AAAAAA",
      stroke: "#000000",
      activeColor: "#1DE9AC",
    },
    subLabel: {
      color: "#000000",
      stroke: "transparent",
      activeColor: "#1DE9AC",
    },
  },
  lasso: {
    border: "1px solid #55aaff",
    background: "rgba(75, 160, 255, 0.1)",
  },
  ring: {
    fill: "#D8E6EA",
    activeFill: "#1DE9AC",
  },
  edge: {
    stroke: "white",
    strokeWidth: 1,
    fill: "none",
  },
  arrow: {
    fill: "#D8E6EA",
    activeFill: "#1DE9AC",
  },
  cluster: {
    stroke: "#D8E6EA",
    opacity: 1,
    selectedOpacity: 1,
    inactiveOpacity: 0.1,
    label: {
      stroke: "#fff",
      color: "#2A6475",
    },
  },
};

function adjustNodes(winner: string, guesses: Guess[], mapNodes: MapNode[], svg: d3.Selection<SVGGElement, unknown, null, undefined>, hideNotGuessed: boolean) {
  const todayGuesses = guesses.map((guess: Guess) => guess.name.toLowerCase());
  const nodeGroups = svg.selectAll(".node-group");

  if (hideNotGuessed) {
    nodeGroups.selectAll("text").style("display", "none");
  }

  for (const guess of todayGuesses) {
    const findNode: MapNode | undefined = mapNodes.find((node: MapNode) => {
      if (node.label) {
        return node.label.toLowerCase() === guess;
      }
      return [];
    });
    if (findNode) {
      if (findNode.label) {
        if (findNode.label.toLowerCase() === winner) {
          nodeGroups.select(`circle[id="${findNode.id}"]`).style("fill", "green");
          nodeGroups.selectAll("text").style("display", "unset");
          continue;
        }
      }
      nodeGroups.select(`circle[id="${findNode.id}"]`).style("fill", "red");
      nodeGroups.select(`circle[id="${findNode.id}"] + text`).style("display", "unset");
    }
  }

  if (guesses.length === 6 || guesses.filter(guess => guess.distance === 0).length === 1) {
    nodeGroups.selectAll("text").style("display", "unset");
  }
}

export default Help;