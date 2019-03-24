import TableHead from "@material-ui/core/TableHead/TableHead";
import TableRow from "@material-ui/core/TableRow/TableRow";
import TableCell from "@material-ui/core/TableCell/TableCell";
import TableBody from "@material-ui/core/TableBody/TableBody";
import Table from "@material-ui/core/Table/Table";
import React, {Component} from "react";
import {withStyles} from "@material-ui/core";

class TrainTable extends Component {

    //palauttaa true, jos juna on peruttu ja false, jos ei
    isCancelled(trainNumber) {
        let trainArray = this.props.trainArray;

        for (let i = 0; i < trainArray.length; i++) {
            //matchataan junan numero siihen, jonka perumistietoja haetaan
            if (trainArray[i].trainNumber === trainNumber) {
                let train = trainArray[i];
                return train.cancelled;
            }
        }
    }

    //aikataulun mukainen aikatauluhaku saapuville junille, entä live estimate + jos cancelled
    getTime(trainNumber, stationCode, type, scheduled) {
        let trainArray = this.props.trainArray;

        let returnedTime;

        for (let i = 0; i < trainArray.length; i++) {

            //matchataan junan numero (oletettavasti uniikki) siihen, jonka aikatauluja haetaan
            if (trainArray[i].trainNumber === trainNumber) {

                let train = trainArray[i];
                for (let j = 0; j < train.timeTableRows.length; j++) {

                    //matchataan oikea asema (se, joka on hakukentässä) ja katsotaan, että aikataulutiedon tyyppi on oikea
                    if (train.timeTableRows[j].stationShortCode === stationCode && train.timeTableRows[j].type === type) {

                        //ikävän monta sisäkkäistä if-lausetta, mutta kirjoitan mieluummin näin kuin yhdistän yhteen if-lauseeseen useampia parametrejä
                        //jos tekisin uuden funktion tähän, pitäisi kaikki tämän funktionkin parametrit antaa eteenpäin, joten ei juuri järkeä

                        //jos juna on myöhässä virallisesta aikataulusta
                        if(scheduled === true && this.isLate(trainNumber, stationCode, type)) {

                            //date-objektin käyttäminen tässä ottaa paikallisen aikavyöhykkeen huomioon
                            returnedTime = new Date(train.timeTableRows[j].scheduledTime);

                            return "(" + this.timeToString(returnedTime) + ")";
                        }

                        //jos juna on ajallaan viralliseen aikatauluun
                        else if (scheduled === true) {
                            returnedTime = new Date(train.timeTableRows[j].scheduledTime);

                            return this.timeToString(returnedTime);
                        }

                        //jos haetaan live estimate -aikaa
                        else if (train.timeTableRows[j].liveEstimateTime && (train.timeTableRows[j].differenceInMinutes > 0)) {
                            returnedTime = new Date(train.timeTableRows[j].liveEstimateTime);

                            return this.timeToString(returnedTime);
                        }
                    }
                }
            }
        }
        return "";
    }

    //aikatulosteen korjausta yllä olevaan getTime-funktioon
    timeToString(time) {
        let hours = time.getHours();
        if (hours < 10) {
            hours = "0" + hours;
        }

        let minutes = time.getMinutes();
        if (minutes < 10) {
            minutes = "0" + minutes;
        }

        return hours + ":" + minutes;
    }

    //palauttaa true, jos haettu juna saapuu/lähtee myöhässä annetulla asemalla; false jos ei
    isLate(trainNumber, stationCode, type) {
        let trainArray = this.props.trainArray;

        for (var i = 0; i < trainArray.length; i++) {
            //matchataan junan numero siihen, jonka aikatauluja haetaan
            if (trainArray[i].trainNumber === trainNumber) {
                let train = trainArray[i];
                for (let j = 0; j < train.timeTableRows.length; j++) {
                    //matchataan oikea asema ja katsotaan, että aikataulutiedon tyyppi on oikea
                    if (train.timeTableRows[j].stationShortCode === stationCode && train.timeTableRows[j].type === type) {
                        if (train.timeTableRows[j].liveEstimateTime && (train.timeTableRows[j].differenceInMinutes > 0)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    //ottaa syötteenä aseman koodin ja palauttaa sen nimen
    codeToStation(stationCode) {
        for (let i = 0; i < this.props.stations.length; i++) {
            if (this.props.stations[i].stationShortCode === stationCode) {
                //splitataan, jotta päästään eroon lopun mahdollisista "asema" tai "ratapiha" -päätteistä, joita esimerkissä ei ollut
                return this.props.stations[i].stationName.split(" asema")[0];
            }
        }
    }

    render() {
        const {classes} = this.props;

        console.log(this.props.stationCode);
        console.log(this.props.type);

        return (
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
                    this.props.trainArray.slice(0, 10).map( row => (
                        <TableRow className={this.isCancelled(row.trainNumber, this.props.type) ? classes.rowCancelled : classes.row} key={row.trainNumber} >
                            <TableCell>{row.trainType + ' ' + row.trainNumber}</TableCell>
                            <TableCell>{this.codeToStation(row.timeTableRows[0].stationShortCode)}</TableCell>
                            <TableCell>{this.codeToStation(row.timeTableRows[row.timeTableRows.length-1].stationShortCode)}</TableCell>
                            <TableCell>
                                <div className={classes.liveTime}>
                                    {this.getTime(row.trainNumber, this.props.stationCode, this.props.type, false)}
                                </div>
                                <div className={this.isLate(row.trainNumber, this.props.stationCode, "ARRIVAL") ? classes.lateTrain : classes.onTimeTrain}>
                                    {this.getTime(row.trainNumber, this.props.stationCode, this.props.type, true)}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                }</TableBody>
            </Table>
        )
    }
}


const styles = ({
    row: {
        '&:nth-of-type(odd)': {
            backgroundColor: '#f3f3f3',
        },
    },
    rowCancelled: {
        '&:nth-of-type(odd)': {
            backgroundColor: '#f3f3f3',
        },
        color: '#444444',
    },
    onTimeTrain: {
    },
    lateTrain: {
        fontSize: 11,
    },
    liveTime: {
        color: '#FF0000',
    },
    root: {
        flexGrow: 1,
    },
});

export default withStyles(styles)(TrainTable);