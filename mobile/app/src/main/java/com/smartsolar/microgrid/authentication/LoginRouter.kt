package com.smartsolar.microgrid.authentication

sealed interface LoginDestination {
    data object ProsumerHome : LoginDestination
    data object OperatorHome : LoginDestination
    data object BackofficeHome : LoginDestination
}

class LoginRouter {
    fun destinationFor(role: UserRole): LoginDestination = when (role) {
        UserRole.PROSUMER -> LoginDestination.ProsumerHome
        UserRole.GRID_OPERATOR -> LoginDestination.OperatorHome
        UserRole.BACKOFFICE -> LoginDestination.BackofficeHome
    }
}
