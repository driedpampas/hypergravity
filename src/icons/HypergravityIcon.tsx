import type { SVGAttributes } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

type HypergravityIconProps = SVGAttributes<SVGSVGElement> & {
    monochrome?: boolean;
};

export function HypergravityIcon({ monochrome = false, ...props }: HypergravityIconProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!monochrome || !svgRef.current) return;

        const paths = svgRef.current.querySelectorAll('path');
        paths.forEach((path) => {
            path.style.fill = 'currentColor';
        });
    }, [monochrome]);

    return (
        <svg
            {...props}
            ref={svgRef}
            width="24"
            height="24"
            viewBox="0 0 4.2333332 4.2333333"
            version="1.1"
            aria-hidden="true"
        >
            <title>Hypergravity icon</title>
            <g id="layer1">
                <g id="g1">
                    <path
                        style="fill:#B195AF;fill-opacity:0.62352943;"
                        d="M 2.38125,3.4395833 H 2.6458333 V 3.7041666 H 2.38125"
                        id="path218"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.62352943;"
                        d="M 2.6458333,3.175 H 2.9104167 V 3.4395833 H 2.6458333"
                        id="path203"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:1;"
                        d="M 2.38125,3.175 H 2.6458333 V 3.4395833 H 2.38125"
                        id="path202"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.62352943;"
                        d="M 2.1166667,3.175 H 2.38125 V 3.4395833 H 2.1166667"
                        id="path201"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.13725491;"
                        d="M 2.9104167,2.9104167 H 3.175 V 3.175 H 2.9104167"
                        id="path188"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:1;"
                        d="M 2.6458333,2.9104167 H 2.9104167 V 3.175 H 2.6458333"
                        id="path187"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.16862746;"
                        d="M 2.38125,2.9104167 H 2.6458333 V 3.175 H 2.38125"
                        id="path186"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.90588236;"
                        d="M 2.1166667,2.9104167 H 2.38125 V 3.175 H 2.1166667"
                        id="path185"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.13725491;"
                        d="M 1.8520834,2.9104167 H 2.1166667 V 3.175 H 1.8520834"
                        id="path184"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.62352943;"
                        d="M 3.175,2.6458333 H 3.4395833 V 2.9104167 H 3.175"
                        id="path173"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:1;"
                        d="M 2.9104167,2.6458333 H 3.175 V 2.9104167 H 2.9104167"
                        id="path172"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.36862746;"
                        d="M 2.6458333,2.6458333 H 2.9104167 V 2.9104167 H 2.6458333"
                        id="path171"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.36862746;"
                        d="M 2.1166667,2.6458333 H 2.38125 V 2.9104167 H 2.1166667"
                        id="path169"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.92156863;"
                        d="M 1.8520834,2.6458333 H 2.1166667 V 2.9104167 H 1.8520834"
                        id="path168"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.62352943;"
                        d="M 1.5875001,2.6458333 H 1.8520834 V 2.9104167 H 1.5875001"
                        id="path167"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.62352943;"
                        d="M 3.4395833,2.38125 H 3.7041666 V 2.6458333 H 3.4395833"
                        id="path158"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:1;"
                        d="M 3.175,2.38125 H 3.4395833 V 2.6458333 H 3.175"
                        id="path157"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.16862746;"
                        d="M 2.9104167,2.38125 H 3.175 V 2.6458333 H 2.9104167"
                        id="path156"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.00392157;"
                        d="M 2.1166667,2.38125 H 2.38125 V 2.6458333 H 2.1166667"
                        id="path153"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.16862746;"
                        d="M 1.8520834,2.38125 H 2.1166667 V 2.6458333 H 1.8520834"
                        id="path152"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.98039216;"
                        d="M 1.5875001,2.38125 H 1.8520834 V 2.6458333 H 1.5875001"
                        id="path151"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.65098041;"
                        d="M 1.3229167,2.38125 H 1.5875001 V 2.6458333 H 1.3229167"
                        id="path150"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.62352943;"
                        d="M 3.175,2.1166667 H 3.4395833 V 2.38125 H 3.175"
                        id="path141"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:1;"
                        d="M 2.9104167,2.1166667 H 3.175 V 2.38125 H 2.9104167"
                        id="path140"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.36862746;"
                        d="M 2.6458333,2.1166667 H 2.9104167 V 2.38125 H 2.6458333"
                        id="path139"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.00392157;"
                        d="M 2.38125,2.1166667 H 2.6458333 V 2.38125 H 2.38125"
                        id="path138"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.36862746;"
                        d="M 2.1166667,2.1166667 H 2.38125 V 2.38125 H 2.1166667"
                        id="path137"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:1;"
                        d="M 1.8520834,2.1166667 H 2.1166667 V 2.38125 H 1.8520834"
                        id="path136"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.62352943;"
                        d="M 1.5875001,2.1166667 H 1.8520834 V 2.38125 H 1.5875001"
                        id="path135"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.00392157;"
                        d="M 1.3229167,2.1166667 H 1.5875001 V 2.38125 H 1.3229167"
                        id="path134"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.19607843;"
                        d="M 1.0583334,2.1166667 H 1.3229167 V 2.38125 H 1.0583334"
                        id="path133"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.2;"
                        d="M 0.7937501,2.1166667 H 1.0583334 V 2.38125 H 0.7937501"
                        id="path132"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.13725491;"
                        d="M 2.9104167,1.8520834 H 3.175 V 2.1166667 H 2.9104167"
                        id="path124"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:1;"
                        d="M 2.6458333,1.8520834 H 2.9104167 V 2.1166667 H 2.6458333"
                        id="path123"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.16862746;"
                        d="M 2.38125,1.8520834 H 2.6458333 V 2.1166667 H 2.38125"
                        id="path122"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:1;"
                        d="M 2.1166667,1.8520834 H 2.38125 V 2.1166667 H 2.1166667"
                        id="path121"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.13725491;"
                        d="M 1.8520834,1.8520834 H 2.1166667 V 2.1166667 H 1.8520834"
                        id="path120"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.07058824;"
                        d="M 1.5875001,1.8520834 H 1.8520834 V 2.1166667 H 1.5875001"
                        id="path119"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.24313726;"
                        d="M 1.0583334,1.8520834 H 1.3229167 V 2.1166667 H 1.0583334"
                        id="path117"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.91764706;"
                        d="M 0.7937501,1.8520834 H 1.0583334 V 2.1166667 H 0.7937501"
                        id="path116"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.23137255;"
                        d="M 0.52916678,1.8520834 H 0.7937501 V 2.1166667 H 0.52916678"
                        id="path115"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.62352943;"
                        d="M 2.6458333,1.5875001 H 2.9104167 V 1.8520834 H 2.6458333"
                        id="path107"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:1;"
                        d="M 2.38125,1.5875001 H 2.6458333 V 1.8520834 H 2.38125"
                        id="path106"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.62352943;"
                        d="M 2.1166667,1.5875001 H 2.38125 V 1.8520834 H 2.1166667"
                        id="path105"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.08235294;"
                        d="M 1.8520834,1.5875001 H 2.1166667 V 1.8520834 H 1.8520834"
                        id="path104"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.9137255;"
                        d="M 1.5875001,1.5875001 H 1.8520834 V 1.8520834 H 1.5875001"
                        id="path103"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.25098041;"
                        d="M 1.3229167,1.5875001 H 1.5875001 V 1.8520834 H 1.3229167"
                        id="path102"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.27450982;"
                        d="M 0.7937501,1.5875001 H 1.0583334 V 1.8520834 H 0.7937501"
                        id="path100"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.91764706;"
                        d="M 0.52916678,1.5875001 H 0.7937501 V 1.8520834 H 0.52916678"
                        id="path99"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.04705882;"
                        d="M 0.26458346,1.5875001 H 0.52916678 V 1.8520834 H 0.26458346"
                        id="path98"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.64705884;"
                        d="M 2.38125,1.3229167 H 2.6458333 V 1.5875001 H 2.38125"
                        id="path90"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.00392157;"
                        d="M 2.1166667,1.3229167 H 2.38125 V 1.5875001 H 2.1166667"
                        id="path89"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.25098041;"
                        d="M 1.5875001,1.3229167 H 1.8520834 V 1.5875001 H 1.5875001"
                        id="path87"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.9137255;"
                        d="M 1.3229167,1.3229167 H 1.5875001 V 1.5875001 H 1.3229167"
                        id="path86"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.25098041;"
                        d="M 1.0583334,1.3229167 H 1.3229167 V 1.5875001 H 1.0583334"
                        id="path85"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.06666667;"
                        d="M 0.52916678,1.3229167 H 0.7937501 V 1.5875001 H 0.52916678"
                        id="path83"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.20392157;"
                        d="M 2.1166667,1.0583334 H 2.38125 V 1.3229167 H 2.1166667"
                        id="path73"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.24313726;"
                        d="M 1.8520834,1.0583334 H 2.1166667 V 1.3229167 H 1.8520834"
                        id="path72"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.24705882;"
                        d="M 1.3229167,1.0583334 H 1.5875001 V 1.3229167 H 1.3229167"
                        id="path70"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.9137255;"
                        d="M 1.0583334,1.0583334 H 1.3229167 V 1.3229167 H 1.0583334"
                        id="path69"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.25098041;"
                        d="M 0.7937501,1.0583334 H 1.0583334 V 1.3229167 H 0.7937501"
                        id="path68"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.20392157;"
                        d="M 2.1166667,0.7937501 H 2.38125 V 1.0583334 H 2.1166667"
                        id="path57"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.91764706;"
                        d="M 1.8520834,0.7937501 H 2.1166667 V 1.0583334 H 1.8520834"
                        id="path56"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.27450982;"
                        d="M 1.5875001,0.7937501 H 1.8520834 V 1.0583334 H 1.5875001"
                        id="path55"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.24705882;"
                        d="M 1.0583334,0.7937501 H 1.3229167 V 1.0583334 H 1.0583334"
                        id="path53"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.9137255;"
                        d="M 0.7937501,0.7937501 H 1.0583334 V 1.0583334 H 0.7937501"
                        id="path52"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.21176471;"
                        d="M 0.52916678,0.7937501 H 0.7937501 V 1.0583334 H 0.52916678"
                        id="path51"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.23137255;"
                        d="M 1.8520834,0.52916678 H 2.1166667 V 0.7937501 H 1.8520834"
                        id="path40"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.9137255"
                        d="M 1.5875001,0.52916678 H 1.8520834 V 0.7937501 H 1.5875001"
                        id="path39"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.06666667;"
                        d="M 1.3229167,0.52916678 H 1.5875001 V 0.7937501 H 1.3229167"
                        id="path38"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.20784314;"
                        d="M 0.7937501,0.52916678 H 1.0583334 V 0.7937501 H 0.7937501"
                        id="path36"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.15294118;"
                        d="M 0.52916678,0.52916678 H 0.7937501 V 0.7937501 H 0.52916678"
                        id="path35"
                    />
                    <path
                        style="fill:#B195AF;fill-opacity:0.05490196;stroke:none;stroke-opacity:1"
                        d="M 1.5875001,0.26458346 H 1.8520834 V 0.52916678 H 1.5875001"
                        id="path23"
                    />
                </g>
            </g>
        </svg>
    );
}
