import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Measure from 'Components/Measure';
import Menu from 'Components/Menu/Menu';
import MenuContent from 'Components/Menu/MenuContent';
import MenuItem from 'Components/Menu/MenuItem';
import ToolbarMenuButton from 'Components/Menu/ToolbarMenuButton';
import SpinnerIcon from 'Components/SpinnerIcon';
import { forEach } from 'Helpers/elementChildren';
import { align, icons } from 'Helpers/Props';
import dimensions from 'Styles/Variables/dimensions';
import styles from './PageToolbarSection.css';

const BUTTON_WIDTH = parseInt(dimensions.toolbarButtonWidth);
const SEPARATOR_MARGIN = parseInt(dimensions.toolbarSeparatorMargin);
const SEPARATOR_WIDTH = 2 * SEPARATOR_MARGIN + 1;
const SMALL_SCREEN = parseInt(dimensions.breakpointSmall);
const MORE_BUTTON_WIDTH = 90;

// v5 toolbar buttons are pills sized by their label (icon beside the label, or above
// it on a phone), so estimate each one from its label instead of a fixed width.
function getButtonWidth(child) {
  const label = child.props.label || child.props.text;

  if (typeof label !== 'string') {
    return BUTTON_WIDTH;
  }

  if (window.innerWidth <= SMALL_SCREEN) {
    return Math.max(56, Math.ceil(label.length * 6.6) + 20);
  }

  // 14px padding each side, 16px icon, 7px gap, about 7.4px a character at 13px
  return Math.ceil(label.length * 7.4) + 51;
}

function calculateOverflowItems(children, isMeasured, width, collapseButtons) {
  let buttonCount = 0;
  let separatorCount = 0;
  let buttonsWidth = 0;
  const validChildren = [];

  forEach(children, (child) => {
    if (Object.keys(child.props).length === 0) {
      separatorCount++;
    } else {
      buttonCount++;
      buttonsWidth += getButtonWidth(child);
    }

    validChildren.push(child);
  });

  const separatorsWidth = separatorCount * SEPARATOR_WIDTH;
  const totalWidth = buttonsWidth + separatorsWidth;

  // If the width of buttons and separators is less than
  // the available width return all valid children.

  if (
    !isMeasured ||
    !collapseButtons ||
    totalWidth < width
  ) {
    return {
      buttons: validChildren,
      buttonCount,
      totalWidth,
      overflowItems: []
    };
  }

  const buttons = [];
  const overflowItems = [];
  let usedWidth = MORE_BUTTON_WIDTH;
  let isOverflowing = false;

  validChildren.forEach((child, index) => {
    const isSeparator = Object.keys(child.props).length === 0;

    if (isSeparator) {
      return;
    }

    const buttonWidth = getButtonWidth(child);

    if (!isOverflowing && (buttons.length === 0 || usedWidth + buttonWidth <= width)) {
      buttons.push(child);
      usedWidth += buttonWidth;
    } else {
      isOverflowing = true;
      overflowItems.push(child.props);
    }
  });

  return {
    buttons,
    buttonCount,
    totalWidth,
    overflowItems
  };
}

class PageToolbarSection extends Component {

  //
  // Lifecycle

  constructor(props, context) {
    super(props, context);

    this.state = {
      isMeasured: false,
      width: 0,
      buttons: [],
      overflowItems: []
    };
  }

  //
  // Listeners

  onMeasure = ({ width }) => {
    this.setState({
      isMeasured: true,
      width
    });
  };

  //
  // Render

  render() {
    const {
      children,
      alignContent,
      collapseButtons
    } = this.props;

    const {
      isMeasured,
      width
    } = this.state;

    const {
      buttons,
      totalWidth,
      overflowItems
    } = calculateOverflowItems(children, isMeasured, width, collapseButtons);

    return (
      <Measure
        onMeasure={this.onMeasure}
        className={styles.sectionContainer}
        style={{
          flexGrow: totalWidth
        }}
      >
        {
          isMeasured ?
            <div className={classNames(
              styles.section,
              styles[alignContent]
            )}
            >
              {
                buttons.map((button) => {
                  return button;
                })
              }

              {
                !!overflowItems.length &&
                  <Menu>
                    <ToolbarMenuButton
                      className={styles.overflowMenuButton}
                      iconName={icons.OVERFLOW}
                      text="More"
                    />

                    <MenuContent>
                      {
                        overflowItems.map((item) => {
                          const {
                            iconName,
                            spinningName,
                            label,
                            isDisabled,
                            isSpinning,
                            ...otherProps
                          } = item;

                          return (
                            <MenuItem
                              key={label}
                              isDisabled={isDisabled || isSpinning}
                              {...otherProps}
                            >
                              <SpinnerIcon
                                className={styles.overflowMenuItemIcon}
                                name={iconName}
                                spinningName={spinningName}
                                isSpinning={isSpinning}
                              />
                              {label}
                            </MenuItem>
                          );
                        })
                      }
                    </MenuContent>
                  </Menu>
              }
            </div> :
            null
        }
      </Measure>
    );
  }

}

PageToolbarSection.propTypes = {
  children: PropTypes.node,
  alignContent: PropTypes.oneOf([align.LEFT, align.CENTER, align.RIGHT]),
  collapseButtons: PropTypes.bool.isRequired
};

PageToolbarSection.defaultProps = {
  alignContent: align.LEFT,
  collapseButtons: true
};

export default PageToolbarSection;
