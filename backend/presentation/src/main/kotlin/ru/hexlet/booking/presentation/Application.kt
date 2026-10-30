package ru.hexlet.booking.presentation

import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.routing.routing
import org.koin.dsl.module
import org.koin.ktor.plugin.Koin
import org.koin.logger.slf4jLogger
import ru.hexlet.booking.application.Clock
import ru.hexlet.booking.infrastructure.SystemClock

val infrastructureModule =
    module {
        single<Clock> { SystemClock() }
    }

fun Application.module() {
    install(Koin) {
        slf4jLogger()
        modules(infrastructureModule)
    }
    install(ContentNegotiation) { json() }
    routing {
        healthRoutes()
    }
}
