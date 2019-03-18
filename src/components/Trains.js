import React from 'react';
import axios from 'axios';
import {withStyles} from "@material-ui/core";

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import InputAdornment from '@material-ui/core/InputAdornment';
import Clear from '@material-ui/icons/Clear';

class Trains extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            station: "",
            stationCode: "",
            stations: [],
            arrivals: [],
            departures: [],
            tabValue: 0,
        }
    }

    handleClickClear = () => {
        this.setState({ station: "", stationCode: "", arrivals: [], departures: [] });
    };

    handleTabChange = (event, tabValue) => {
        this.setState({ tabValue });
    };

    handleStationChange = station => event => {
        this.setState({
            [station]: event.target.value,
            stationCode: this.stationToCode(event.target.value),
        }, () => {
            axios.get('https://rata.digitraffic.fi/api/v1/live-trains/station/' + this.state.stationCode + '?arrived_trains=0&arriving_trains=15&departed_trains=0&departing_trains=0&include_nonstopping=false')
                .then(response => {

                    let filtered = response.data.filter(function(obj) {
                        //ei rahtijunia, vetureita eikä vaihtotyötä, oletuksena softa on matkustajille. tiedä sitten mitä muut junatyypit ovat
                        return obj.trainCategory !== "Cargo" && obj.trainCategory !== "Locomotive" && obj.trainCategory !== "Shunting";
                    });

                    this.setState({
                        arrivals: filtered
                    });
                });

            axios.get('https://rata.digitraffic.fi/api/v1/live-trains/station/' + this.state.stationCode + '?arrived_trains=0&arriving_trains=0&departed_trains=0&departing_trains=15&include_nonstopping=false')
                .then(response => {

                    let filtered = response.data.filter(function(obj) {
                        //ei rahtijunia, vetureita eikä vaihtotyötä, oletuksena softa on matkustajille. tiedä sitten mitä muut junatyypit ovat
                        return obj.trainCategory !== "Cargo" && obj.trainCategory !== "Locomotive" && obj.trainCategory !== "Shunting";
                    });

                    this.setState({
                        departures: filtered
                    });
                });
        });
    };

    componentDidMount() {
        axios.get('https://rata.digitraffic.fi/api/v1/metadata/stations')
            .then(response => {
                this.setState({
                    stations: response.data
                }, () => {
                });
            });
    }

    //ottaa syötteenä aseman nimen ja palauttaa sen asemakoodin
    stationToCode(station) {
        for (var i = 0; i < this.state.stations.length; i++) {
            if (this.state.stations[i].stationName.toLowerCase() === station.toLowerCase()) {
                return this.state.stations[i].stationShortCode;
            }
        }
    }

    //ottaa syötteenä aseman koodin ja palauttaa sen nimen
    codeToStation(stationCode) {
        for (var i = 0; i < this.state.stations.length; i++) {
            if (this.state.stations[i].stationShortCode === stationCode) {
                //splitataan, jotta päästään eroon lopun mahdollisista "asema" tai "ratapiha" -päätteistä, joita esimerkissä ei ollut
                return this.state.stations[i].stationName; //.split(" ")[0]
            }
        }
    }


    //aikataulun mukainen aikatauluhaku saapuville junille, entä live estimate + jos cancelled
    getTime(trainNumber, stationCode, type, scheduled) {
        for (var i = 0; i < this.state.arrivals.length; i++) {
            //matchataan junan numero (oletettavasti uniikki) siihen, jonka aikatauluja haetaan
            if (this.state.arrivals[i].trainNumber === trainNumber) {
                let train = this.state.arrivals[i];
                for (let j = 0; j < train.timeTableRows.length; j++) {
                    //matchataan oikea asema (se, joka on hakukentässä) ja katsotaan, että aikataulutiedon tyyppi on saapuminen
                    if (train.timeTableRows[j].stationShortCode === stationCode && train.timeTableRows[j].type === type) {
                        if (scheduled === true) {
                            if(!this.isLate(trainNumber, stationCode, type)) {
                                return (train.timeTableRows[j].scheduledTime).slice(0, 16);
                            }
                            else {
                                let sliced = (train.timeTableRows[j].scheduledTime).slice(11, 16);
                                return "(" + sliced + ")";
                            }
                        }
                        else if (train.timeTableRows[j].liveEstimateTime && train.timeTableRows[j].liveEstimateTime !== train.timeTableRows[j].scheduledTime){
                            return (train.timeTableRows[j].liveEstimateTime).slice(0, 16);
                        }
                    }
                }
            }
        }
        return "";
    }

    isLate(trainNumber, stationCode, type) {
        for (var i = 0; i < this.state.arrivals.length; i++) {
            //matchataan junan numero (oletettavasti uniikki) siihen, jonka aikatauluja haetaan
            if (this.state.arrivals[i].trainNumber === trainNumber) {
                let train = this.state.arrivals[i];
                for (let j = 0; j < train.timeTableRows.length; j++) {
                    //matchataan oikea asema (se, joka on hakukentässä) ja katsotaan, että aikataulutiedon tyyppi on saapuminen
                    if (train.timeTableRows[j].stationShortCode === stationCode && train.timeTableRows[j].type === type) {
                        if (train.timeTableRows[j].liveEstimateTime && train.timeTableRows[j].liveEstimateTime !== train.timeTableRows[j].scheduledTime) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    render() {

        const {classes} = this.props;
        const {tabValue} = this.state;
        const {arrivals} = this.state;
        const {departures} = this.state;

        return(
            <div>
                <div>
                    <p className={classes.text}>
                        <b>Hae aseman nimellä</b>
                    </p>
                    <form noValidate autoComplete="off">
                        <TextField
                            id="search"
                            className={classes.search}
                            value={this.state.station}
                            onChange={this.handleStationChange('station')}
                            margin="dense"
                            variant="outlined"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={this.handleClickClear}
                                            className={classes.clear}
                                        >
                                            <Clear/>
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </form>
                </div>

                <div className={classes.root}>
                    <Tabs
                        value={tabValue}
                        onChange={this.handleTabChange}
                        classes={{root: classes.tabsRoot, indicator: classes.tabsIndicator}}
                    >
                        <Tab
                            label="Saapuvat"
                            disableRipple
                            classes={{ root: classes.tabRoot, selected: classes.tabSelected }}
                        />
                        <Tab
                            label="Lähtevät"
                            disableRipple
                            classes={{ root: classes.tabRoot, selected: classes.tabSelected }}
                        />
                    </Tabs>
                </div>

                {tabValue === 0 && <TabContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Juna</TableCell>
                                <TableCell>Lähtöasema</TableCell>
                                <TableCell>Pääteasema</TableCell>
                                <TableCell>Saapuu</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>{
                            arrivals.map( row => (
                                <TableRow className={classes.row} key={row.trainNumber}>
                                    <TableCell>{row.trainType + ' ' + row.trainNumber}</TableCell>
                                    <TableCell>{this.codeToStation(row.timeTableRows[0].stationShortCode)}</TableCell>
                                    <TableCell>{this.codeToStation(row.timeTableRows[row.timeTableRows.length-1].stationShortCode)}</TableCell>
                                    <TableCell>
                                        <div className={this.isLate(row.trainNumber, this.state.stationCode, "ARRIVAL") ? classes.lateTrain : classes.onTimeTrain}>
                                            {this.getTime(row.trainNumber, this.state.stationCode, "ARRIVAL", false)}
                                        </div>
                                        <div className={this.isLate(row.trainNumber, this.state.stationCode, "ARRIVAL") ? classes.liveTime : classes.onTimeTrain}>
                                            {this.getTime(row.trainNumber, this.state.stationCode, "ARRIVAL", true)}
                                        </div>
                                        <div className={classes.cancelled}>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        }</TableBody>
                    </Table>
                </TabContainer>}

                {tabValue === 1 && <TabContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Juna</TableCell>
                                <TableCell>Lähtöasema</TableCell>
                                <TableCell>Pääteasema</TableCell>
                                <TableCell>Lähtee</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>{
                            departures.map( row => (
                                <TableRow className={classes.row} key={row.trainNumber}>
                                    <TableCell>{row.trainType + ' ' + row.trainNumber}</TableCell>
                                    <TableCell>{this.codeToStation(row.timeTableRows[0].stationShortCode)}</TableCell>
                                    <TableCell>{this.codeToStation(row.timeTableRows[row.timeTableRows.length-1].stationShortCode)}</TableCell>
                                    <TableCell>
                                        <div className={this.isLate(row.trainNumber, this.state.stationCode, "DEPARTURE") ? classes.lateTrain : classes.onTimeTrain}>
                                            {this.getTime(row.trainNumber, this.state.stationCode, "DEPARTURE", true)}
                                        </div>
                                        <div className={classes.liveTime}>
                                            {this.getTime(row.trainNumber, this.state.stationCode, "DEPARTURE", false)}
                                        </div>
                                        <div className={classes.cancelled}>
                                        </div>
                                    </TableCell>                                </TableRow>
                            ))
                        }</TableBody>
                    </Table>
                </TabContainer>}

            </div>
        )
    }
}

const styles = theme => ({
    row: {
        '&:nth-of-type(odd)': {
            backgroundColor: '#f3f3f3',
        },
    },
    text: {
        margin: 20,
        marginBottom: 0,
    },
    onTimeTrain: {
        color: '#000000',
    },
    lateTrain: {
        color: '#FF0000',
    },
    cancelled: {
        color: '#FF0000',
    },
    liveTime: {
        fontSize: 11,
    },
    search: {
        marginLeft: 20,
        marginBottom: 40,
        borderColor: '#35852a',
        backgroundColor: '#f3f3f3',
        '&:focus': {
            borderColor: '#35852a',
            opacity: 1,
        },
    },
    root: {
        flexGrow: 1,
    },
    clear: {
        marginRight: 0,
    },
    tabsRoot: {
        borderBottom: '1px solid #e8e8e8',
    },
    tabsIndicator: {
        backgroundColor: '#35852a',
    },
    tabRoot: {
        textTransform: 'initial',
        minWidth: 72,
        color: '#35852a',
        '&:nth-of-type(odd)': {
            marginLeft: 20,
        },
        '&:hover': {
            color: '#000000',
            opacity: 1,
        },
        '&$tabSelected': {
            color: '#000000',
            borderTop: '1px solid #e8e8e8',
            borderLeft: '1px solid #e8e8e8',
            borderRight: '1px solid #e8e8e8',
            borderbottom: '6px solid #000000',
        },
        '&:focus': {
            color: '#000000',
            opacity: 1,
        },
    },
    tabSelected: {},
    typography: {
        padding: theme.spacing.unit * 3,
    },
});

function TabContainer(props) {
    return (
        <div>
            {props.children}
        </div>
    );
}

export default withStyles(styles)(Trains);