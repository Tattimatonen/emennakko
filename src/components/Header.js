import React, { Component } from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import {withStyles} from "@material-ui/core";

class Header extends Component {

    render() {
        const {classes} = this.props;

        return (
            <AppBar position="static">
                <Toolbar className={classes.root}>
                    <b>Aseman junatiedot</b>
                </Toolbar>
            </AppBar>
        )
    }
}

const styles = {
    root: {
        flexGrow: 1,
        backgroundColor: "#35852a"
    },
};

export default withStyles(styles)(Header);