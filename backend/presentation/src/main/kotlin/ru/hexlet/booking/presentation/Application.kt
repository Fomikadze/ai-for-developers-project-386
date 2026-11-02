package ru.hexlet.booking.presentation

import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.config.ApplicationConfig
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.routing.routing
import org.koin.core.module.Module
import org.koin.dsl.module
import org.koin.ktor.plugin.Koin
import org.koin.logger.slf4jLogger
import ru.hexlet.booking.application.Clock
import ru.hexlet.booking.infrastructure.SystemClock

/** Обработчики команд и запросов. Пока пуст: наполняется по мере появления историй. */
fun applicationModule(): Module = module { }

/** Реализации портов: часы и хранилища в памяти. Новый вызов даёт свежие хранилища. */
fun infrastructureModule(): Module =
    module {
        single<Clock> { SystemClock() }
    }

/** Конфигурация приложения, читаемая из `application.conf`. */
fun configurationModule(config: ApplicationConfig): Module =
    module {
        single { config }
    }

fun Application.defaultModules(): List<Module> =
    listOf(
        configurationModule(environment.config),
        infrastructureModule(),
        applicationModule(),
    )

fun Application.configureApp(modules: List<Module>) {
    install(Koin) {
        slf4jLogger()
        modules(modules)
    }
    install(ContentNegotiation) { json() }
    configureErrorHandling()
    routing {
        healthRoutes()
    }
}

fun Application.module() = configureApp(defaultModules())
