import React, { Fragment } from 'react';
import Select from 'react-select';

export default function ThemedSelect(props) {
    const colors = {
        /*
         * multiValue(remove)/color:hover
         */
        danger: 'var(--danger)',

        /*
         * multiValue(remove)/backgroundColor(focused)
         * multiValue(remove)/backgroundColor:hover
         */
        dangerLight: 'var(--danger-light)',

        /*
         * control/backgroundColor
         * menu/backgroundColor
         * option/color(selected)
         */
        neutral0: 'var(--my-bg-color4)',

        /*
          * control/backgroundColor(disabled)
         */
        neutral5: 'var(--neutral-5)',

        /*
         * control/borderColor(disabled)
         * multiValue/backgroundColor
         * indicators(separator)/backgroundColor(disabled)
         */
        neutral10: 'var(--neutral-10)',

        /*
         * control/borderColor
         * option/color(disabled)
         * indicators/color
         * indicators(separator)/backgroundColor
         * indicators(loading)/color
         */
        neutral20: 'rgba(255, 255, 255, 0.25)',

        /*
         * control/borderColor(focused)
         * control/borderColor:hover
         */
        neutral30: 'var(--neutral-30)',

        /*
         * menu(notice)/color
         * singleValue/color(disabled)
         * indicators/color:hover
         */
        neutral40: 'var(--neutral-40)',

        /*
         * placeholder/color
         */
        neutral50: 'var(--neutral-50)',

        /*
         * indicators/color(focused)
         * indicators(loading)/color(focused)
         */
        neutral60: 'var(--neutral-60)',

        neutral70: 'var(--neutral-70)',

        /*
         * input/color
         * multiValue(label)/color
          * singleValue/color
         * indicators/color(focused)
         * indicators/color:hover(focused)
         */
        neutral80: 'var(--neutral-80)',

        neutral90: 'var(--neutral-90)',

        /*
         * control/boxShadow(focused)
         * control/borderColor(focused)
         * control/borderColor:hover(focused)
         * option/backgroundColor(selected)
         * option/backgroundColor:active(selected)
         */
        primary: 'grey',

        /*
         * option/backgroundColor(focused)
         */
        primary25: 'var(--my-bg-color2)',

        /*
         * option/backgroundColor:active
         */
        primary50: 'var(--my-bg-color3)',

        primary75: 'var(--my-bg-color3)',
    };

    const styles = {
        menu: ({ width, ...css }) => ({
            ...css,
            width: "max-content",
            minWidth: "50px",
            maxWidth: "250px",
        }),
        container: ({ width, ...css }) => ({
            ...css,
            width: "100%",
            minWidth: "50px",
        }),
        singleValue: ({ width, ...css }) => ({
            ...css,
            width: "100%",
            minWidth: "50px",
        }),
        control: ({ width, ...css }) => ({
            ...css,
            width: "100%",
            minWidth: "50px",
        }),
      };

    return (
        <Fragment>
            <Select id={props.id}
                className='d-flex justify-content-start input-dark'
                value={{
                    value: props.value,
                    label: props.value
                }}
                onChange={props.onChange}
                options={props.options}
                isSearchable={false}
                isMulti={false}
                theme={theme => ({
                    ...theme,
                    colors: {
                        ...colors
                    }
                })}
                styles={styles}
            />
        </Fragment>

    )
}